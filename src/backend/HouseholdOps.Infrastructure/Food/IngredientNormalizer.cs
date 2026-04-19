using System.Text.RegularExpressions;

namespace HouseholdOps.Infrastructure.Food;

internal static partial class IngredientNormalizer
{
    private static readonly HashSet<string> PreparationTokens = new(StringComparer.OrdinalIgnoreCase)
    {
        "chopped",
        "minced",
        "diced",
        "crushed",
        "grated",
        "sliced",
        "halved",
        "cubed",
        "shredded",
        "julienned",
        "peeled",
        "trimmed",
        "room-temperature",
        "softened",
        "melted",
        "to taste"
    };

    private static readonly HashSet<string> FormTokens = new(StringComparer.OrdinalIgnoreCase)
    {
        "ground",
        "powdered",
        "dried",
        "fresh",
        "whole"
    };

    private static readonly Dictionary<string, string> CanonicalUnits = new(StringComparer.OrdinalIgnoreCase)
    {
        ["tbsp"] = "tbsp",
        ["tablespoon"] = "tbsp",
        ["tablespoons"] = "tbsp",
        ["tsp"] = "tsp",
        ["teaspoon"] = "tsp",
        ["teaspoons"] = "tsp",
        ["oz"] = "oz",
        ["ounce"] = "oz",
        ["ounces"] = "oz",
        ["lb"] = "lb",
        ["lbs"] = "lb",
        ["pound"] = "lb",
        ["pounds"] = "lb",
        ["g"] = "g",
        ["gram"] = "g",
        ["grams"] = "g",
        ["kg"] = "kg",
        ["kilogram"] = "kg",
        ["kilograms"] = "kg",
        ["l"] = "l",
        ["liter"] = "l",
        ["liters"] = "l",
        ["ml"] = "ml",
        ["milliliter"] = "ml",
        ["milliliters"] = "ml",
        ["cup"] = "cup",
        ["cups"] = "cup",
        ["piece"] = "piece",
        ["pieces"] = "piece",
        ["unit"] = "piece",
        ["units"] = "piece",
        ["ct"] = "piece",
        ["count"] = "piece"
    };

    public static IngredientParseResult ParseIngredient(string raw)
    {
        var cleaned = NormalizeName(raw);
        var withoutParentheticals = ParentheticalRegex().Replace(cleaned, " ").Trim();
        var head = withoutParentheticals
            .Split([',', ';'], 2, StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .FirstOrDefault() ?? cleaned;

        head = LeadingQuantityRegex().Replace(head, string.Empty).Trim();
        var tokens = head
            .Split(' ', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .ToList();

        var preparation = new List<string>();
        var form = new List<string>();
        var core = new List<string>();
        foreach (var token in tokens)
        {
            if (PreparationTokens.Contains(token))
            {
                preparation.Add(token);
            }
            else if (FormTokens.Contains(token))
            {
                form.Add(token);
                core.Add(token);
            }
            else
            {
                core.Add(token);
            }
        }

        var coreName = string.Join(' ', core).Trim();
        if (string.IsNullOrWhiteSpace(coreName))
        {
            coreName = cleaned;
        }

        var preparationText = string.Join(", ", preparation.Distinct(StringComparer.OrdinalIgnoreCase));
        var formText = string.Join(", ", form.Distinct(StringComparer.OrdinalIgnoreCase));

        return new IngredientParseResult(
            cleaned,
            coreName,
            string.IsNullOrWhiteSpace(preparationText) ? null : preparationText,
            string.IsNullOrWhiteSpace(formText) ? null : formText);
    }

    public static string NormalizeName(string value) =>
        string.Join(
            ' ',
            value.Trim().ToLowerInvariant()
                .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));

    public static string? CanonicalUnit(string? unit)
    {
        if (string.IsNullOrWhiteSpace(unit))
        {
            return null;
        }

        var cleaned = unit.Trim().ToLowerInvariant();
        return CanonicalUnits.TryGetValue(cleaned, out var canonical) ? canonical : cleaned;
    }

    public static bool AreUnitsCompatible(string? left, string? right) =>
        string.Equals(CanonicalUnit(left), CanonicalUnit(right), StringComparison.OrdinalIgnoreCase)
        || string.IsNullOrWhiteSpace(left)
        || string.IsNullOrWhiteSpace(right);

    public static bool NeedsReviewForForms(string? leftForm, string? rightForm)
    {
        if (string.IsNullOrWhiteSpace(leftForm) || string.IsNullOrWhiteSpace(rightForm))
        {
            return false;
        }

        return !string.Equals(leftForm, rightForm, StringComparison.OrdinalIgnoreCase);
    }

    [GeneratedRegex(@"\([^)]*\)", RegexOptions.Compiled)]
    private static partial Regex ParentheticalRegex();

    [GeneratedRegex(@"^\s*([\d¼½¾\/\.]+|a|an)\s+", RegexOptions.Compiled | RegexOptions.IgnoreCase)]
    private static partial Regex LeadingQuantityRegex();
}

internal sealed record IngredientParseResult(
    string NormalizedName,
    string CoreName,
    string? Preparation,
    string? Form);
