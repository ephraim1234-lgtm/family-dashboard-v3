using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using HouseholdOps.Modules.Food.Contracts;

namespace HouseholdOps.Infrastructure.Food;

internal static partial class FoodRecipeImportParser
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static ParsedRecipeImport Parse(string sourceUrl, string html)
    {
        var warnings = new List<string>();
        var sourceUri = new Uri(sourceUrl);
        var sourceSiteName = sourceUri.Host.Replace("www.", "", StringComparison.OrdinalIgnoreCase);
        var fallbackImageUrl = NormalizeImageUrl(
            ExtractMetaContent(html, "og:image") ?? ExtractMetaContent(html, "twitter:image"),
            sourceUri);

        foreach (Match match in JsonLdScriptRegex().Matches(html))
        {
            var rawJson = match.Groups["json"].Value;
            try
            {
                using var document = JsonDocument.Parse(rawJson);
                var recipeNode = FindRecipeNode(document.RootElement);
                if (recipeNode is null)
                {
                    continue;
                }

                var payload = ParseRecipeNode(recipeNode.Value, sourceUrl, sourceSiteName, fallbackImageUrl);
                if (!string.IsNullOrWhiteSpace(payload.Title))
                {
                    return payload;
                }
            }
            catch (JsonException)
            {
                warnings.Add("Skipped one recipe metadata block because it could not be parsed.");
            }
        }

        warnings.Add("No schema.org recipe metadata was found. Review and edit before saving.");

        return new ParsedRecipeImport(
            Title: ExtractMetaContent(html, "og:title") ?? sourceSiteName,
            Summary: ExtractMetaContent(html, "description"),
            YieldText: null,
            ImageUrl: fallbackImageUrl,
            SourceSiteName: sourceSiteName,
            Ingredients: Array.Empty<RecipeEditableIngredientResponse>(),
            Steps: Array.Empty<RecipeEditableStepResponse>(),
            Warnings: warnings,
            Confidence: 0.15m,
            RawPayloadJson: JsonSerializer.Serialize(
                new
                {
                    sourceUrl,
                    fallbackTitle = ExtractMetaContent(html, "og:title"),
                    fallbackDescription = ExtractMetaContent(html, "description")
                },
                JsonOptions));
    }

    private static ParsedRecipeImport ParseRecipeNode(
        JsonElement recipeNode,
        string sourceUrl,
        string sourceSiteName,
        string? fallbackImageUrl)
    {
        var sourceUri = new Uri(sourceUrl);
        var title = ReadString(recipeNode, "name");
        var summary = ReadString(recipeNode, "description");
        var yieldText = ReadStringOrFirstArray(recipeNode, "recipeYield");
        var imageUrl = ReadImageUrl(recipeNode, sourceUri) ?? fallbackImageUrl;
        var ingredientLines = ReadStringArray(recipeNode, "recipeIngredient");
        var stepTexts = ReadStepTexts(recipeNode);

        var parsedIngredients = ingredientLines
            .Where(line => !string.IsNullOrWhiteSpace(line))
            .Select(ParseIngredientLine)
            .ToList();
        var parsedSteps = stepTexts
            .Where(line => !string.IsNullOrWhiteSpace(line))
            .Select((instruction, index) => new RecipeEditableStepResponse(index + 1, instruction.Trim()))
            .ToList();

        var warnings = new List<string>();
        if (parsedIngredients.Count == 0)
        {
            warnings.Add("Ingredient parsing was limited. Review before saving.");
        }

        if (parsedSteps.Count == 0)
        {
            warnings.Add("Step parsing was limited. Review before saving.");
        }

        var publisher = ReadNestedString(recipeNode, "publisher", "name")
            ?? ReadNestedString(recipeNode, "author", "name")
            ?? sourceSiteName;

        var confidence = 0.25m;
        if (!string.IsNullOrWhiteSpace(title))
        {
            confidence += 0.25m;
        }

        if (parsedIngredients.Count > 0)
        {
            confidence += 0.25m;
        }

        if (parsedSteps.Count > 0)
        {
            confidence += 0.25m;
        }

        return new ParsedRecipeImport(
            Title: title,
            Summary: summary,
            YieldText: yieldText,
            ImageUrl: imageUrl,
            SourceSiteName: publisher,
            Ingredients: parsedIngredients,
            Steps: parsedSteps,
            Warnings: warnings,
            Confidence: confidence,
            RawPayloadJson: JsonSerializer.Serialize(
                new
                {
                    sourceUrl,
                    title,
                    summary,
                    yieldText,
                    publisher,
                    ingredientLines,
                    stepTexts
                },
                JsonOptions));
    }

    private static RecipeEditableIngredientResponse ParseIngredientLine(string rawLine)
    {
        var line = Regex.Replace(rawLine.Trim(), "\\s+", " ");
        var optional = line.Contains("optional", StringComparison.OrdinalIgnoreCase);
        line = line.Replace("(optional)", "", StringComparison.OrdinalIgnoreCase).Trim();

        decimal? quantity = null;
        string? unit = null;
        string ingredientName = line;
        string? preparation = null;

        var prepParts = line.Split(',', 2, StringSplitOptions.TrimEntries);
        if (prepParts.Length == 2)
        {
            ingredientName = prepParts[0];
            preparation = prepParts[1];
        }

        var tokens = ingredientName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (tokens.Length > 1)
        {
            var quantityTokenCount = TryReadQuantityTokenCount(tokens, out var parsedQuantity);
            if (quantityTokenCount > 0)
            {
                quantity = parsedQuantity;
                var remaining = tokens.Skip(quantityTokenCount).ToArray();
                if (remaining.Length > 1 && UnitWords.Contains(remaining[0], StringComparer.OrdinalIgnoreCase))
                {
                    unit = remaining[0];
                    ingredientName = string.Join(' ', remaining.Skip(1));
                }
                else
                {
                    ingredientName = string.Join(' ', remaining);
                }
            }
        }

        return new RecipeEditableIngredientResponse(
            string.IsNullOrWhiteSpace(ingredientName) ? rawLine.Trim() : ingredientName.Trim(),
            quantity,
            unit,
            preparation,
            optional);
    }

    private static int TryReadQuantityTokenCount(IReadOnlyList<string> tokens, out decimal? quantity)
    {
        quantity = null;
        if (tokens.Count == 0)
        {
            return 0;
        }

        if (TryParseFractional(tokens[0], out var single))
        {
            quantity = single;
            if (tokens.Count > 1 && TryParseFractional(tokens[1], out var fractional))
            {
                quantity += fractional;
                return 2;
            }

            return 1;
        }

        return 0;
    }

    private static bool TryParseFractional(string token, out decimal value)
    {
        token = token.Trim();
        if (decimal.TryParse(token, NumberStyles.Number, CultureInfo.InvariantCulture, out value))
        {
            return true;
        }

        var fractionParts = token.Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (fractionParts.Length == 2
            && decimal.TryParse(fractionParts[0], NumberStyles.Number, CultureInfo.InvariantCulture, out var numerator)
            && decimal.TryParse(fractionParts[1], NumberStyles.Number, CultureInfo.InvariantCulture, out var denominator)
            && denominator != 0)
        {
            value = numerator / denominator;
            return true;
        }

        value = 0;
        return false;
    }

    private static string? ExtractMetaContent(string html, string propertyName)
    {
        var pattern =
            $"<meta[^>]+(?:property|name)=[\"']{Regex.Escape(propertyName)}[\"'][^>]+content=[\"'](?<value>.*?)[\"'][^>]*>";
        var match = Regex.Match(html, pattern, RegexOptions.IgnoreCase | RegexOptions.Singleline);
        return match.Success ? HtmlDecode(match.Groups["value"].Value.Trim()) : null;
    }

    private static string HtmlDecode(string value) =>
        value
            .Replace("&amp;", "&", StringComparison.OrdinalIgnoreCase)
            .Replace("&quot;", "\"", StringComparison.OrdinalIgnoreCase)
            .Replace("&#39;", "'", StringComparison.OrdinalIgnoreCase)
            .Replace("&lt;", "<", StringComparison.OrdinalIgnoreCase)
            .Replace("&gt;", ">", StringComparison.OrdinalIgnoreCase);

    private static JsonElement? FindRecipeNode(JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.Object)
        {
            if (IsRecipeNode(element))
            {
                return element;
            }

            if (element.TryGetProperty("@graph", out var graph) && graph.ValueKind == JsonValueKind.Array)
            {
                foreach (var node in graph.EnumerateArray())
                {
                    var found = FindRecipeNode(node);
                    if (found is not null)
                    {
                        return found;
                    }
                }
            }

            foreach (var property in element.EnumerateObject())
            {
                var found = FindRecipeNode(property.Value);
                if (found is not null)
                {
                    return found;
                }
            }
        }

        if (element.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in element.EnumerateArray())
            {
                var found = FindRecipeNode(item);
                if (found is not null)
                {
                    return found;
                }
            }
        }

        return null;
    }

    private static bool IsRecipeNode(JsonElement element)
    {
        if (!element.TryGetProperty("@type", out var typeProperty))
        {
            return false;
        }

        return typeProperty.ValueKind switch
        {
            JsonValueKind.String => typeProperty.GetString()?.Contains("Recipe", StringComparison.OrdinalIgnoreCase) == true,
            JsonValueKind.Array => typeProperty.EnumerateArray()
                .Any(item => item.ValueKind == JsonValueKind.String
                    && item.GetString()?.Contains("Recipe", StringComparison.OrdinalIgnoreCase) == true),
            _ => false
        };
    }

    private static string? ReadString(JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var property))
        {
            return null;
        }

        return property.ValueKind == JsonValueKind.String
            ? property.GetString()?.Trim()
            : null;
    }

    private static string? ReadStringOrFirstArray(JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var property))
        {
            return null;
        }

        return property.ValueKind switch
        {
            JsonValueKind.String => property.GetString()?.Trim(),
            JsonValueKind.Array => property.EnumerateArray()
                .Select(item => item.ValueKind == JsonValueKind.String ? item.GetString() : null)
                .FirstOrDefault(value => !string.IsNullOrWhiteSpace(value))?.Trim(),
            _ => null
        };
    }

    private static string? ReadImageUrl(JsonElement element, Uri sourceUri)
    {
        if (!element.TryGetProperty("image", out var property))
        {
            return null;
        }

        return NormalizeImageUrl(ReadImageProperty(property), sourceUri);
    }

    private static string? ReadImageProperty(JsonElement property) =>
        property.ValueKind switch
        {
            JsonValueKind.String => property.GetString()?.Trim(),
            JsonValueKind.Object => ReadString(property, "url")
                ?? ReadString(property, "contentUrl")
                ?? ReadString(property, "@id"),
            JsonValueKind.Array => property.EnumerateArray()
                .Select(ReadImageProperty)
                .FirstOrDefault(value => !string.IsNullOrWhiteSpace(value)),
            _ => null
        };

    private static IReadOnlyList<string> ReadStringArray(JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var property)
            || property.ValueKind != JsonValueKind.Array)
        {
            return Array.Empty<string>();
        }

        return property.EnumerateArray()
            .Where(item => item.ValueKind == JsonValueKind.String)
            .Select(item => item.GetString()?.Trim())
            .Where(item => !string.IsNullOrWhiteSpace(item))
            .Cast<string>()
            .ToList();
    }

    private static IReadOnlyList<string> ReadStepTexts(JsonElement element)
    {
        if (!element.TryGetProperty("recipeInstructions", out var property))
        {
            return Array.Empty<string>();
        }

        if (property.ValueKind == JsonValueKind.String)
        {
            return property.GetString()?
                .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .ToList() ?? [];
        }

        if (property.ValueKind != JsonValueKind.Array)
        {
            return Array.Empty<string>();
        }

        var steps = new List<string>();
        foreach (var item in property.EnumerateArray())
        {
            switch (item.ValueKind)
            {
                case JsonValueKind.String:
                    if (!string.IsNullOrWhiteSpace(item.GetString()))
                    {
                        steps.Add(item.GetString()!.Trim());
                    }
                    break;
                case JsonValueKind.Object:
                    var text = ReadString(item, "text");
                    if (!string.IsNullOrWhiteSpace(text))
                    {
                        steps.Add(text);
                    }
                    else if (item.TryGetProperty("itemListElement", out var nestedSteps) && nestedSteps.ValueKind == JsonValueKind.Array)
                    {
                        steps.AddRange(ReadStepTexts(JsonDocument.Parse(nestedSteps.GetRawText()).RootElement));
                    }
                    break;
            }
        }

        return steps;
    }

    private static string? ReadNestedString(JsonElement element, string propertyName, string nestedName)
    {
        if (!element.TryGetProperty(propertyName, out var property))
        {
            return null;
        }

        if (property.ValueKind == JsonValueKind.Object)
        {
            return ReadString(property, nestedName);
        }

        if (property.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in property.EnumerateArray())
            {
                var nested = ReadNestedString(item, nestedName, nestedName)
                    ?? ReadString(item, nestedName);
                if (!string.IsNullOrWhiteSpace(nested))
                {
                    return nested;
                }
            }
        }

        return null;
    }

    private static string? NormalizeImageUrl(string? candidate, Uri sourceUri)
    {
        if (string.IsNullOrWhiteSpace(candidate))
        {
            return null;
        }

        if (Uri.TryCreate(candidate.Trim(), UriKind.Absolute, out var absoluteUri)
            && (absoluteUri.Scheme == Uri.UriSchemeHttp || absoluteUri.Scheme == Uri.UriSchemeHttps))
        {
            return absoluteUri.ToString();
        }

        if (Uri.TryCreate(sourceUri, candidate.Trim(), out var relativeUri)
            && (relativeUri.Scheme == Uri.UriSchemeHttp || relativeUri.Scheme == Uri.UriSchemeHttps))
        {
            return relativeUri.ToString();
        }

        return null;
    }

    [GeneratedRegex("<script[^>]*type=[\"']application/ld\\+json[\"'][^>]*>(?<json>.*?)</script>", RegexOptions.IgnoreCase | RegexOptions.Singleline)]
    private static partial Regex JsonLdScriptRegex();

    private static readonly string[] UnitWords =
    [
        "cup",
        "cups",
        "tbsp",
        "tablespoon",
        "tablespoons",
        "tsp",
        "teaspoon",
        "teaspoons",
        "lb",
        "lbs",
        "pound",
        "pounds",
        "oz",
        "ounce",
        "ounces",
        "g",
        "kg",
        "ml",
        "l",
        "clove",
        "cloves",
        "can",
        "cans",
        "package",
        "packages",
        "stick",
        "sticks"
    ];
}

internal sealed record ParsedRecipeImport(
    string? Title,
    string? Summary,
    string? YieldText,
    string? ImageUrl,
    string? SourceSiteName,
    IReadOnlyList<RecipeEditableIngredientResponse> Ingredients,
    IReadOnlyList<RecipeEditableStepResponse> Steps,
    IReadOnlyList<string> Warnings,
    decimal Confidence,
    string RawPayloadJson);
