using System.Globalization;
using System.Text.Json;
using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Modules.Food;
using HouseholdOps.Modules.Food.Contracts;
using Microsoft.EntityFrameworkCore;

namespace HouseholdOps.Infrastructure.Food;

public sealed class FoodService(
    HouseholdOpsDbContext dbContext,
    IHttpClientFactory httpClientFactory) : IFoodService
{
    public async Task<FoodDashboardResponse> GetDashboardAsync(
        Guid householdId,
        CancellationToken cancellationToken)
    {
        await EnsureDefaultFoodSetupAsync(householdId, cancellationToken);
        await AutoArchiveCompletedShoppingListsAsync(householdId, DateTimeOffset.UtcNow, cancellationToken);

        var pantryLocations = await dbContext.PantryLocations
            .Where(location => location.HouseholdId == householdId)
            .OrderBy(location => location.SortOrder)
            .ThenBy(location => location.Name)
            .Select(location => new PantryLocationResponse(location.Id, location.Name, location.SortOrder))
            .ToListAsync(cancellationToken);

        var pantryItems = await dbContext.PantryItems
            .Where(item => item.HouseholdId == householdId)
            .OrderBy(item => item.ExpiresAtUtc ?? DateTimeOffset.MaxValue)
            .ThenBy(item => item.IngredientName)
            .Select(item => new
            {
                Item = item,
                LocationName = dbContext.PantryLocations
                    .Where(location => location.Id == item.PantryLocationId)
                    .Select(location => location.Name)
                    .FirstOrDefault()
            })
            .ToListAsync(cancellationToken);

        var defaultShoppingList = await GetOrCreateDefaultShoppingListAsync(householdId, cancellationToken);
        var shoppingItems = await dbContext.ShoppingListItems
            .Where(item => item.HouseholdId == householdId && item.ShoppingListId == defaultShoppingList.Id)
            .OrderBy(item => item.State == ShoppingListItemStates.Purchased || item.State == ShoppingListItemStates.Skipped)
            .ThenBy(item => item.State == ShoppingListItemStates.NeedsReview ? 0 : 1)
            .ThenBy(item => item.SortOrder)
            .ThenBy(item => item.IngredientName)
            .Take(64)
            .ToListAsync(cancellationToken);

        var recipeResponses = await BuildRecipeSummariesAsync(householdId, null, 24, cancellationToken);

        var upcomingSlots = await dbContext.MealPlanSlots
            .Where(slot => slot.HouseholdId == householdId && slot.Date >= DateOnly.FromDateTime(DateTime.UtcNow.Date))
            .OrderBy(slot => slot.Date)
            .ThenBy(slot => slot.SlotName)
            .Take(8)
            .ToListAsync(cancellationToken);
        var mealResponses = await BuildMealPlanSlotResponsesAsync(householdId, upcomingSlots, shoppingItems, cancellationToken);

        var shoppingHistory = await BuildShoppingListSummariesAsync(
            householdId,
            new[] { ShoppingListStatuses.Completed, ShoppingListStatuses.Archived },
            10,
            cancellationToken);

        var activeSessions = await dbContext.CookingSessions
            .Where(session => session.HouseholdId == householdId && session.Status == CookingSessionStatuses.Active)
            .OrderByDescending(session => session.UpdatedAtUtc)
            .Take(8)
            .ToListAsync(cancellationToken);
        var activeSessionResponses = await BuildCookingSessionSummariesAsync(activeSessions, cancellationToken);

        var pantryResponses = pantryItems
            .Select(item => ToPantryItemResponse(item.Item, item.LocationName))
            .ToList();

        var shoppingResponse = new ShoppingListResponse(
            defaultShoppingList.Id,
            defaultShoppingList.Name,
            defaultShoppingList.StoreName,
            defaultShoppingList.Status,
            defaultShoppingList.CreatedAtUtc,
            defaultShoppingList.CompletedAtUtc,
            defaultShoppingList.ArchivedAtUtc,
            defaultShoppingList.CompletedByUserId,
            defaultShoppingList.ItemsPurchasedCount,
            shoppingItems.Select(ToShoppingListItemResponse).ToList());

        var expiringSoonCount = pantryResponses.Count(item =>
            item.ExpiresAtUtc is not null && item.ExpiresAtUtc <= DateTimeOffset.UtcNow.AddDays(5));
        var lowStockCount = pantryResponses.Count(item =>
            string.Equals(item.Status, "Low", StringComparison.OrdinalIgnoreCase)
            || string.Equals(item.Status, "Out", StringComparison.OrdinalIgnoreCase));

        var tonightCookView = await BuildTonightCookViewAsync(householdId, cancellationToken);

        return new FoodDashboardResponse(
            new FoodSummaryResponse(
                recipeResponses.Count,
                pantryResponses.Count,
                lowStockCount,
                expiringSoonCount,
                mealResponses.Count,
                shoppingResponse.Items.Count(item => item.State != ShoppingListItemStates.Purchased && item.State != ShoppingListItemStates.Skipped),
                activeSessionResponses.Count),
            tonightCookView,
            recipeResponses,
            pantryResponses,
            pantryLocations,
            mealResponses,
            shoppingResponse,
            shoppingHistory,
            activeSessionResponses);
    }

    public async Task<RecipeImportReviewResponse> CreateRecipeImportAsync(
        Guid householdId,
        Guid userId,
        CreateRecipeImportRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Url)
            || !Uri.TryCreate(request.Url.Trim(), UriKind.Absolute, out var sourceUri)
            || (sourceUri.Scheme != Uri.UriSchemeHttp && sourceUri.Scheme != Uri.UriSchemeHttps))
        {
            throw new InvalidOperationException("A valid recipe URL is required.");
        }

        var client = httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(12);
        client.DefaultRequestHeaders.UserAgent.ParseAdd("HouseholdOps/0.1 (+self-hosted)");

        ParsedRecipeImport parsedImport;
        var jobStatus = RecipeImportJobStatuses.Parsed;
        string? failureReason = null;

        try
        {
            var html = await client.GetStringAsync(sourceUri, cancellationToken);
            parsedImport = FoodRecipeImportParser.Parse(sourceUri.ToString(), html);
            if (parsedImport.Ingredients.Count == 0 && parsedImport.Steps.Count == 0)
            {
                jobStatus = RecipeImportJobStatuses.Failed;
                failureReason = "Recipe metadata could not be confidently extracted from the source page.";
            }
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            jobStatus = RecipeImportJobStatuses.Failed;
            failureReason = "The recipe page could not be fetched for import review.";
            parsedImport = new ParsedRecipeImport(
                sourceUri.Host.Replace("www.", "", StringComparison.OrdinalIgnoreCase),
                null,
                null,
                sourceUri.Host.Replace("www.", "", StringComparison.OrdinalIgnoreCase),
                Array.Empty<RecipeEditableIngredientResponse>(),
                Array.Empty<RecipeEditableStepResponse>(),
                ["The source page could not be fetched. You can still review and save a manual household version."],
                0.05m,
                JsonSerializer.Serialize(new { sourceUri = sourceUri.ToString(), error = ex.Message }));
        }

        var job = new RecipeImportJob
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            CreatedByUserId = userId,
            SourceUrl = sourceUri.ToString(),
            Status = jobStatus,
            ParserConfidence = parsedImport.Confidence,
            ImportedTitle = parsedImport.Title,
            ImportedYieldText = parsedImport.YieldText,
            ImportedSummary = parsedImport.Summary,
            SourceSiteName = parsedImport.SourceSiteName,
            FailureReason = failureReason,
            RawPayloadJson = parsedImport.RawPayloadJson,
            CreatedAtUtc = nowUtc,
            ParsedAtUtc = nowUtc
        };

        dbContext.RecipeImportJobs.Add(job);
        await dbContext.SaveChangesAsync(cancellationToken);

        var warnings = parsedImport.Warnings.ToList();
        if (!string.IsNullOrWhiteSpace(failureReason))
        {
            warnings.Add(failureReason);
        }

        return new RecipeImportReviewResponse(
            job.Id,
            job.Status,
            job.ParserConfidence,
            job.SourceUrl,
            parsedImport.SourceSiteName,
            parsedImport.Title,
            parsedImport.Summary,
            parsedImport.YieldText,
            parsedImport.Ingredients,
            parsedImport.Steps,
            warnings);
    }

    public async Task<IReadOnlyList<RecipeSummaryResponse>> ListRecipesAsync(
        Guid householdId,
        string? query,
        CancellationToken cancellationToken) =>
        await BuildRecipeSummariesAsync(householdId, query, null, cancellationToken);

    public async Task<RecipeDetailResponse?> GetRecipeAsync(
        Guid householdId,
        Guid recipeId,
        CancellationToken cancellationToken)
    {
        var recipe = await dbContext.Recipes
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.HouseholdId == householdId && item.Id == recipeId, cancellationToken);
        if (recipe is null || recipe.ImportedSourceRevisionId is null || recipe.CurrentRevisionId is null)
        {
            return null;
        }

        return await BuildRecipeDetailAsync(recipe, cancellationToken);
    }

    public async Task<RecipeDetailResponse> SaveRecipeAsync(
        Guid householdId,
        Guid userId,
        SaveRecipeRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        var content = ValidateRecipeContent(request.Title, request.Summary, request.YieldText, request.Tags, request.Notes, request.Ingredients, request.Steps);

        RecipeImportJob? importJob = null;
        if (request.ImportJobId is not null)
        {
            importJob = await dbContext.RecipeImportJobs
                .FirstOrDefaultAsync(job => job.HouseholdId == householdId && job.Id == request.ImportJobId.Value, cancellationToken)
                ?? throw new InvalidOperationException("Recipe import review could not be found.");
        }

        var sourceKind = importJob is null ? RecipeSourceKinds.Manual : RecipeSourceKinds.UrlImport;
        var source = new RecipeSource
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            Kind = sourceKind,
            SourceUrl = importJob?.SourceUrl,
            SourceTitle = importJob?.ImportedTitle ?? content.Title,
            SourceSiteName = importJob?.SourceSiteName,
            Attribution = importJob?.SourceSiteName ?? "Household",
            CreatedAtUtc = nowUtc
        };

        var recipe = new Recipe
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            SourceId = source.Id,
            Title = content.Title,
            Summary = content.Summary,
            Tags = content.Tags,
            CreatedAtUtc = nowUtc,
            UpdatedAtUtc = nowUtc
        };

        source.RecipeId = recipe.Id;

        var importedRevision = new RecipeRevision
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            RecipeId = recipe.Id,
            CreatedByUserId = userId,
            Kind = RecipeRevisionKinds.ImportedSource,
            RevisionNumber = 1,
            Title = content.Title,
            Summary = content.Summary,
            YieldText = content.YieldText,
            Notes = content.Notes,
            Tags = content.Tags,
            CreatedAtUtc = nowUtc
        };

        var householdRevision = new RecipeRevision
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            RecipeId = recipe.Id,
            BasedOnRevisionId = importedRevision.Id,
            CreatedByUserId = userId,
            Kind = RecipeRevisionKinds.HouseholdDefault,
            RevisionNumber = 2,
            Title = content.Title,
            Summary = content.Summary,
            YieldText = content.YieldText,
            Notes = content.Notes,
            Tags = content.Tags,
            CreatedAtUtc = nowUtc
        };

        recipe.ImportedSourceRevisionId = importedRevision.Id;
        recipe.CurrentRevisionId = householdRevision.Id;

        dbContext.RecipeSources.Add(source);
        dbContext.Recipes.Add(recipe);
        dbContext.RecipeRevisions.AddRange(importedRevision, householdRevision);

        await CreateRecipeRevisionContentAsync(importedRevision.Id, householdId, content.Ingredients, content.Steps, nowUtc, cancellationToken);
        await CreateRecipeRevisionContentAsync(householdRevision.Id, householdId, content.Ingredients, content.Steps, nowUtc, cancellationToken);

        if (importJob is not null)
        {
            importJob.Status = RecipeImportJobStatuses.Consumed;
            importJob.ConsumedAtUtc = nowUtc;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return await BuildRecipeDetailAsync(recipe, cancellationToken);
    }

    public async Task<RecipeDetailResponse?> UpdateRecipeAsync(
        Guid householdId,
        Guid recipeId,
        Guid userId,
        UpdateRecipeRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        var recipe = await dbContext.Recipes
            .FirstOrDefaultAsync(item => item.HouseholdId == householdId && item.Id == recipeId, cancellationToken);
        if (recipe is null || recipe.CurrentRevisionId is null)
        {
            return null;
        }

        var content = ValidateRecipeContent(request.Title, request.Summary, request.YieldText, request.Tags, request.Notes, request.Ingredients, request.Steps);

        var currentRevision = await dbContext.RecipeRevisions
            .FirstAsync(item => item.Id == recipe.CurrentRevisionId.Value, cancellationToken);
        var nextRevisionNumber = await dbContext.RecipeRevisions
            .Where(item => item.RecipeId == recipe.Id)
            .MaxAsync(item => item.RevisionNumber, cancellationToken) + 1;

        var householdRevision = new RecipeRevision
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            RecipeId = recipe.Id,
            BasedOnRevisionId = currentRevision.Id,
            CreatedByUserId = userId,
            Kind = RecipeRevisionKinds.HouseholdDefault,
            RevisionNumber = nextRevisionNumber,
            Title = content.Title,
            Summary = content.Summary,
            YieldText = content.YieldText,
            Notes = content.Notes,
            Tags = content.Tags,
            CreatedAtUtc = nowUtc
        };

        dbContext.RecipeRevisions.Add(householdRevision);
        await CreateRecipeRevisionContentAsync(householdRevision.Id, householdId, content.Ingredients, content.Steps, nowUtc, cancellationToken);

        recipe.Title = content.Title;
        recipe.Summary = content.Summary;
        recipe.Tags = content.Tags;
        recipe.CurrentRevisionId = householdRevision.Id;
        recipe.UpdatedAtUtc = nowUtc;

        await dbContext.SaveChangesAsync(cancellationToken);
        return await BuildRecipeDetailAsync(recipe, cancellationToken);
    }

    public async Task<bool> DeleteRecipeAsync(
        Guid householdId,
        Guid recipeId,
        CancellationToken cancellationToken)
    {
        var recipe = await dbContext.Recipes
            .FirstOrDefaultAsync(item => item.HouseholdId == householdId && item.Id == recipeId, cancellationToken);
        if (recipe is null)
        {
            return false;
        }

        RecipeSource? source = null;
        if (recipe.SourceId is Guid sourceId)
        {
            source = await dbContext.RecipeSources
                .FirstOrDefaultAsync(item => item.HouseholdId == householdId && item.Id == sourceId, cancellationToken);
        }

        dbContext.Recipes.Remove(recipe);
        if (source is not null)
        {
            dbContext.RecipeSources.Remove(source);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<PantryItemResponse> CreatePantryItemAsync(
        Guid householdId,
        CreatePantryItemRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        await EnsureDefaultFoodSetupAsync(householdId, cancellationToken);

        var ingredientName = request.IngredientName?.Trim();
        if (string.IsNullOrWhiteSpace(ingredientName))
        {
            throw new InvalidOperationException("Ingredient name is required.");
        }

        var location = request.PantryLocationId is null
            ? await dbContext.PantryLocations
                .Where(item => item.HouseholdId == householdId)
                .OrderBy(item => item.SortOrder)
                .FirstAsync(cancellationToken)
            : await dbContext.PantryLocations
                .FirstOrDefaultAsync(
                    item => item.HouseholdId == householdId && item.Id == request.PantryLocationId.Value,
                    cancellationToken)
                ?? throw new InvalidOperationException("Pantry location was not found.");

        var ingredient = await FindOrCreateIngredientAsync(householdId, ingredientName, request.Unit, nowUtc, cancellationToken);
        var pantryItem = new PantryItem
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            IngredientId = ingredient.Id,
            PantryLocationId = location.Id,
            IngredientName = ingredientName,
            NormalizedIngredientName = NormalizeName(ingredientName),
            Quantity = request.Quantity,
            Unit = CleanUnit(request.Unit),
            LowThreshold = request.LowThreshold,
            PurchasedAtUtc = request.PurchasedAtUtc,
            ExpiresAtUtc = request.ExpiresAtUtc,
            UpdatedAtUtc = nowUtc
        };

        pantryItem.Status = ComputePantryStatus(pantryItem.Quantity, pantryItem.LowThreshold);

        dbContext.PantryItems.Add(pantryItem);
        RecordPantryItemActivity(
            householdId,
            pantryItem,
            PantryItemActivityKinds.Created,
            pantryItem.Quantity,
            pantryItem.Quantity,
            pantryItem.Unit,
            null,
            "Pantry entry",
            nowUtc);

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToPantryItemResponse(pantryItem, location.Name);
    }

    public async Task<PantryItemResponse?> UpdatePantryItemAsync(
        Guid householdId,
        Guid pantryItemId,
        UpdatePantryItemRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        var pantryItem = await dbContext.PantryItems
            .FirstOrDefaultAsync(item => item.HouseholdId == householdId && item.Id == pantryItemId, cancellationToken);
        if (pantryItem is null)
        {
            return null;
        }

        PantryLocation? location = null;
        if (request.PantryLocationId is not null)
        {
            location = await dbContext.PantryLocations
                .FirstOrDefaultAsync(item => item.HouseholdId == householdId && item.Id == request.PantryLocationId.Value, cancellationToken)
                ?? throw new InvalidOperationException("Pantry location was not found.");
            pantryItem.PantryLocationId = location.Id;
        }
        else if (pantryItem.PantryLocationId is not null)
        {
            location = await dbContext.PantryLocations
                .FirstOrDefaultAsync(item => item.Id == pantryItem.PantryLocationId.Value, cancellationToken);
        }

        var previousQuantity = pantryItem.Quantity;

        pantryItem.Quantity = request.Quantity;
        pantryItem.Unit = CleanUnit(request.Unit);
        pantryItem.LowThreshold = request.LowThreshold;
        pantryItem.PurchasedAtUtc = request.PurchasedAtUtc;
        pantryItem.ExpiresAtUtc = request.ExpiresAtUtc;
        pantryItem.Status = string.IsNullOrWhiteSpace(request.Status)
            ? ComputePantryStatus(pantryItem.Quantity, pantryItem.LowThreshold)
            : request.Status.Trim();
        pantryItem.UpdatedAtUtc = nowUtc;

        var delta = previousQuantity is not null && request.Quantity is not null
            ? request.Quantity.Value - previousQuantity.Value
            : request.Quantity;
        if (delta is not null || !string.IsNullOrWhiteSpace(request.Note))
        {
            RecordPantryItemActivity(
                householdId,
                pantryItem,
                PantryItemActivityKinds.ManualAdjustment,
                delta,
                pantryItem.Quantity,
                pantryItem.Unit,
                request.Note?.Trim(),
                "Manual pantry edit",
                nowUtc);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return ToPantryItemResponse(pantryItem, location?.Name);
    }

    public async Task<bool> DeletePantryItemAsync(
        Guid householdId,
        Guid pantryItemId,
        CancellationToken cancellationToken)
    {
        var pantryItem = await dbContext.PantryItems
            .FirstOrDefaultAsync(item => item.HouseholdId == householdId && item.Id == pantryItemId, cancellationToken);
        if (pantryItem is null)
        {
            return false;
        }

        dbContext.PantryItems.Remove(pantryItem);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<PantryItemActivityResponse>> GetPantryItemHistoryAsync(
        Guid householdId,
        Guid pantryItemId,
        CancellationToken cancellationToken) =>
        await dbContext.PantryItemActivities
            .AsNoTracking()
            .Where(item => item.HouseholdId == householdId && item.PantryItemId == pantryItemId)
            .OrderByDescending(item => item.OccurredAtUtc)
            .Take(24)
            .Select(item => new PantryItemActivityResponse(
                item.Id,
                item.Kind,
                item.QuantityDelta,
                item.QuantityAfter,
                item.Unit,
                item.Note,
                item.SourceLabel,
                item.OccurredAtUtc))
            .ToListAsync(cancellationToken);

    public async Task<MealPlanSlotResponse?> CreateMealPlanSlotAsync(
        Guid householdId,
        CreateMealPlanSlotRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        var recipeRequests = NormalizeMealRecipeRequests(request);
        if (recipeRequests.Count == 0)
        {
            throw new InvalidOperationException("At least one recipe is required for a meal.");
        }

        var recipeIds = recipeRequests.Select(item => item.RecipeId).Distinct().ToList();
        var recipes = await dbContext.Recipes
            .Where(item => item.HouseholdId == householdId && recipeIds.Contains(item.Id))
            .ToListAsync(cancellationToken);
        if (recipes.Count != recipeIds.Count || recipes.Any(item => item.CurrentRevisionId is null))
        {
            return null;
        }

        var recipeMap = recipes.ToDictionary(item => item.Id);
        var slotTitle = string.IsNullOrWhiteSpace(request.Title)
            ? BuildMealTitle(recipeRequests.Select(item => recipeMap[item.RecipeId].Title).ToList())
            : request.Title.Trim();

        var firstRecipe = recipeMap[recipeRequests[0].RecipeId];
        var slot = new MealPlanSlot
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            RecipeId = firstRecipe.Id,
            Date = request.Date,
            SlotName = string.IsNullOrWhiteSpace(request.SlotName) ? "Dinner" : request.SlotName.Trim(),
            Title = slotTitle,
            RecipeTitleSnapshot = firstRecipe.Title,
            Notes = request.Notes?.Trim(),
            CreatedAtUtc = nowUtc
        };

        dbContext.MealPlanSlots.Add(slot);

        var mealPlanRecipes = recipeRequests
            .Select((item, index) => new MealPlanRecipe
            {
                Id = Guid.NewGuid(),
                MealPlanSlotId = slot.Id,
                RecipeId = item.RecipeId,
                RecipeRevisionId = recipeMap[item.RecipeId].CurrentRevisionId!.Value,
                Role = NormalizeMealRole(item.Role, index),
                Position = index + 1,
                RecipeTitleSnapshot = recipeMap[item.RecipeId].Title,
                CreatedAtUtc = nowUtc
            })
            .ToList();

        dbContext.MealPlanRecipes.AddRange(mealPlanRecipes);
        await dbContext.SaveChangesAsync(cancellationToken);

        if (request.GenerateShoppingList)
        {
            await AddMissingIngredientsToDefaultShoppingListAsync(householdId, slot.Id, true, nowUtc, cancellationToken);
        }

        var recipeRevisionIds = mealPlanRecipes
            .Select(item => item.RecipeRevisionId)
            .Distinct()
            .ToList();
        var recipeIngredients = recipeRevisionIds.Count == 0
            ? []
            : await dbContext.RecipeIngredients
                .AsNoTracking()
                .Where(item => recipeRevisionIds.Contains(item.RecipeRevisionId))
                .OrderBy(item => item.RecipeRevisionId)
                .ThenBy(item => item.Position)
                .ToListAsync(cancellationToken);
        var activeShoppingList = await dbContext.ShoppingLists
            .AsNoTracking()
            .FirstOrDefaultAsync(
                item => item.HouseholdId == householdId && item.IsDefault && item.Status == ShoppingListStatuses.Active,
                cancellationToken);
        var activeShoppingItems = await dbContext.ShoppingListItems
            .AsNoTracking()
            .Where(item => item.HouseholdId == householdId && activeShoppingList != null && item.ShoppingListId == activeShoppingList.Id)
            .ToListAsync(cancellationToken);

        return ToMealPlanSlotResponse(slot, mealPlanRecipes, recipeIngredients, activeShoppingItems);
    }

    public async Task<bool> DeleteMealPlanSlotAsync(
        Guid householdId,
        Guid slotId,
        CancellationToken cancellationToken)
    {
        var slot = await dbContext.MealPlanSlots
            .FirstOrDefaultAsync(item => item.HouseholdId == householdId && item.Id == slotId, cancellationToken);
        if (slot is null)
        {
            return false;
        }

        var mealPlanRecipes = await dbContext.MealPlanRecipes
            .Where(item => item.MealPlanSlotId == slotId)
            .ToListAsync(cancellationToken);

        if (mealPlanRecipes.Count > 0)
        {
            dbContext.MealPlanRecipes.RemoveRange(mealPlanRecipes);
        }

        dbContext.MealPlanSlots.Remove(slot);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> RemoveRecipeFromMealPlanSlotAsync(
        Guid householdId,
        Guid slotId,
        Guid recipeId,
        CancellationToken cancellationToken)
    {
        var slot = await dbContext.MealPlanSlots
            .FirstOrDefaultAsync(item => item.HouseholdId == householdId && item.Id == slotId, cancellationToken);
        if (slot is null)
        {
            return false;
        }

        var mealPlanRecipes = await dbContext.MealPlanRecipes
            .Where(item => item.MealPlanSlotId == slotId)
            .OrderBy(item => item.Position)
            .ToListAsync(cancellationToken);

        var recipeToRemove = mealPlanRecipes
            .FirstOrDefault(item => item.RecipeId == recipeId);
        if (recipeToRemove is null)
        {
            return false;
        }

        dbContext.MealPlanRecipes.Remove(recipeToRemove);

        var remainingRecipes = mealPlanRecipes
            .Where(item => item.Id != recipeToRemove.Id)
            .OrderBy(item => item.Position)
            .ToList();

        for (var index = 0; index < remainingRecipes.Count; index++)
        {
            remainingRecipes[index].Position = index + 1;
        }

        var firstRemainingRecipe = remainingRecipes.FirstOrDefault();
        slot.RecipeId = firstRemainingRecipe?.RecipeId;
        slot.RecipeTitleSnapshot = firstRemainingRecipe?.RecipeTitleSnapshot;

        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<ShoppingListItemResponse> CreateShoppingListItemAsync(
        Guid householdId,
        CreateShoppingListItemRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        await EnsureDefaultFoodSetupAsync(householdId, cancellationToken);
        var ingredientName = request.IngredientName?.Trim();
        if (string.IsNullOrWhiteSpace(ingredientName))
        {
            throw new InvalidOperationException("Shopping item name is required.");
        }

        var parsed = IngredientNormalizer.ParseIngredient(ingredientName);
        var item = await UpsertShoppingItemAsync(
            householdId,
            new ShoppingDraft(
                null,
                ingredientName,
                request.Quantity,
                request.Unit,
                request.Notes?.Trim(),
                "Manual item",
                null,
                null,
                parsed.NormalizedName,
                parsed.CoreName,
                parsed.Preparation,
                parsed.Form),
            pantryAware: false,
            forceSeparate: request.ForceSeparate,
            nowUtc,
            cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);
        return ToShoppingListItemResponse(item);
    }

    public async Task<bool> DeleteShoppingListItemAsync(
        Guid householdId,
        Guid itemId,
        CancellationToken cancellationToken)
    {
        var item = await dbContext.ShoppingListItems
            .FirstOrDefaultAsync(listItem => listItem.HouseholdId == householdId && listItem.Id == itemId, cancellationToken);
        if (item is null)
        {
            return false;
        }

        var shoppingList = await dbContext.ShoppingLists
            .FirstOrDefaultAsync(list => list.HouseholdId == householdId && list.Id == item.ShoppingListId, cancellationToken);

        dbContext.ShoppingListItems.Remove(item);
        await dbContext.SaveChangesAsync(cancellationToken);

        if (shoppingList is not null)
        {
            await RefreshShoppingListCountsAsync(shoppingList, cancellationToken);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return true;
    }

    public async Task<ShoppingListItemResponse?> UpdateShoppingListItemAsync(
        Guid householdId,
        Guid itemId,
        Guid? userId,
        UpdateShoppingListItemRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        var item = await dbContext.ShoppingListItems
            .FirstOrDefaultAsync(listItem => listItem.HouseholdId == householdId && listItem.Id == itemId, cancellationToken);
        if (item is null)
        {
            return null;
        }

        var nextState = request.State;
        if (request.IsCompleted is not null)
        {
            nextState = request.IsCompleted.Value ? ShoppingListItemStates.Purchased : ShoppingListItemStates.Needed;
        }

        if (!string.IsNullOrWhiteSpace(request.Notes))
        {
            item.Notes = request.Notes.Trim();
        }

        if (request.ClearNeedsReview == true && item.State == ShoppingListItemStates.NeedsReview && string.IsNullOrWhiteSpace(nextState))
        {
            nextState = ShoppingListItemStates.Needed;
        }

        if (request.QuantityPurchased is not null)
        {
            item.QuantityPurchased = request.QuantityPurchased;
        }

        if (request.ClearClaim == true)
        {
            item.ClaimedByUserId = null;
            item.ClaimedAtUtc = null;
        }
        else if (request.ClaimForCurrentUser == true && userId is not null)
        {
            item.ClaimedByUserId = userId;
            item.ClaimedAtUtc = nowUtc;
        }

        if (!string.IsNullOrWhiteSpace(nextState))
        {
            ApplyShoppingItemState(item, nextState, nowUtc);
        }

        if ((item.State == ShoppingListItemStates.Purchased || request.MoveToPantry == true)
            && request.MoveToPantry == true)
        {
            await TransferItemToPantryAsync(householdId, item, null, nowUtc, cancellationToken);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return ToShoppingListItemResponse(item);
    }

    public async Task<IReadOnlyList<ShoppingListSummaryResponse>> ListShoppingListsAsync(
        Guid householdId,
        string? status,
        CancellationToken cancellationToken)
    {
        await AutoArchiveCompletedShoppingListsAsync(householdId, DateTimeOffset.UtcNow, cancellationToken);

        var statuses = string.IsNullOrWhiteSpace(status)
            ? new[] { ShoppingListStatuses.Active, ShoppingListStatuses.Completed, ShoppingListStatuses.Archived }
            : new[] { status.Trim() };

        return await BuildShoppingListSummariesAsync(householdId, statuses, 20, cancellationToken);
    }

    public async Task<ShoppingListResponse?> GetShoppingListAsync(
        Guid householdId,
        Guid shoppingListId,
        CancellationToken cancellationToken)
    {
        await AutoArchiveCompletedShoppingListsAsync(householdId, DateTimeOffset.UtcNow, cancellationToken);
        var list = await dbContext.ShoppingLists
            .FirstOrDefaultAsync(item => item.HouseholdId == householdId && item.Id == shoppingListId, cancellationToken);
        if (list is null)
        {
            return null;
        }

        var items = await dbContext.ShoppingListItems
            .Where(item => item.HouseholdId == householdId && item.ShoppingListId == shoppingListId)
            .OrderBy(item => item.SortOrder)
            .ThenBy(item => item.IngredientName)
            .ToListAsync(cancellationToken);

        return new ShoppingListResponse(
            list.Id,
            list.Name,
            list.StoreName,
            list.Status,
            list.CreatedAtUtc,
            list.CompletedAtUtc,
            list.ArchivedAtUtc,
            list.CompletedByUserId,
            list.ItemsPurchasedCount,
            items.Select(ToShoppingListItemResponse).ToList());
    }

    public async Task<IReadOnlyList<ShoppingListItemResponse>> AddItemsFromRecipeAsync(
        Guid householdId,
        AddItemsFromRecipeRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        var recipe = await dbContext.Recipes
            .FirstOrDefaultAsync(item => item.HouseholdId == householdId && item.Id == request.RecipeId, cancellationToken)
            ?? throw new InvalidOperationException("Recipe could not be found.");
        if (recipe.CurrentRevisionId is null)
        {
            throw new InvalidOperationException("Recipe is missing a household-default revision.");
        }

        var ingredients = await dbContext.RecipeIngredients
            .Where(item => item.RecipeRevisionId == recipe.CurrentRevisionId.Value)
            .OrderBy(item => item.Position)
            .ToListAsync(cancellationToken);

        var createdItems = new List<ShoppingListItemResponse>();
        foreach (var ingredient in ingredients)
        {
            var parsed = IngredientNormalizer.ParseIngredient(ingredient.IngredientName);
            var item = await UpsertShoppingItemAsync(
                householdId,
                new ShoppingDraft(
                    ingredient.IngredientId,
                    ingredient.IngredientName,
                    ingredient.Quantity,
                    ingredient.Unit,
                    null,
                    recipe.Title,
                    null,
                    null,
                    parsed.NormalizedName,
                    parsed.CoreName,
                    parsed.Preparation,
                    parsed.Form),
                request.PantryAware,
                forceSeparate: false,
                nowUtc,
                cancellationToken);

            createdItems.Add(ToShoppingListItemResponse(item));
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return createdItems;
    }

    public async Task<IReadOnlyList<ShoppingListItemResponse>> AddItemsFromMealPlanSlotAsync(
        Guid householdId,
        AddItemsFromMealPlanSlotRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        var items = await AddMissingIngredientsToDefaultShoppingListAsync(
            householdId,
            request.MealPlanSlotId,
            request.PantryAware,
            nowUtc,
            cancellationToken);

        return items.Select(ToShoppingListItemResponse).ToList();
    }

    public async Task<IReadOnlyList<ShoppingListItemResponse>> BulkUpdateShoppingItemsAsync(
        Guid householdId,
        BulkUpdateShoppingItemsRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        var items = await dbContext.ShoppingListItems
            .Where(item => item.HouseholdId == householdId && request.ItemIds.Contains(item.Id))
            .ToListAsync(cancellationToken);

        foreach (var item in items)
        {
            ApplyShoppingItemState(item, request.State, nowUtc);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return items.Select(ToShoppingListItemResponse).ToList();
    }

    public async Task<ShoppingListResponse?> TransferShoppingListItemsToPantryAsync(
        Guid householdId,
        Guid shoppingListId,
        Guid? userId,
        TransferToPantryRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        var list = await dbContext.ShoppingLists
            .FirstOrDefaultAsync(item => item.HouseholdId == householdId && item.Id == shoppingListId, cancellationToken);
        if (list is null)
        {
            return null;
        }

        var items = await dbContext.ShoppingListItems
            .Where(item => item.HouseholdId == householdId && item.ShoppingListId == shoppingListId && request.ItemIds.Contains(item.Id))
            .ToListAsync(cancellationToken);

        foreach (var item in items)
        {
            ApplyShoppingItemState(item, ShoppingListItemStates.Purchased, nowUtc);
            var locationOverride = request.ItemLocationOverrides is not null
                && request.ItemLocationOverrides.TryGetValue(item.Id, out var overrideLocationId)
                ? overrideLocationId
                : (Guid?)null;

            await TransferItemToPantryAsync(householdId, item, locationOverride, nowUtc, cancellationToken);
        }

        await RefreshShoppingListCountsAsync(list, cancellationToken);

        if (request.CompleteList)
        {
            await CompleteShoppingListInternalAsync(householdId, list, userId, movePurchasedToPantry: false, nowUtc, cancellationToken);
        }
        else
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return await GetShoppingListAsync(householdId, list.Id, cancellationToken);
    }

    public async Task<ShoppingListResponse?> CompleteShoppingListAsync(
        Guid householdId,
        Guid shoppingListId,
        Guid? userId,
        CompleteShoppingListRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        var list = await dbContext.ShoppingLists
            .FirstOrDefaultAsync(item => item.HouseholdId == householdId && item.Id == shoppingListId, cancellationToken);
        if (list is null)
        {
            return null;
        }

        await CompleteShoppingListInternalAsync(
            householdId,
            list,
            userId,
            request.MoveCheckedToPantry,
            nowUtc,
            cancellationToken);

        return await GetShoppingListAsync(householdId, list.Id, cancellationToken);
    }

    public async Task<MergePreviewResponse> GetShoppingMergePreviewAsync(
        Guid householdId,
        MergePreviewItemRequest request,
        CancellationToken cancellationToken)
    {
        var ingredientName = request.IngredientName?.Trim();
        if (string.IsNullOrWhiteSpace(ingredientName))
        {
            return new MergePreviewResponse(false, null, null, null, null, null, null, ShoppingListItemStates.Needed, null);
        }

        var list = await GetOrCreateDefaultShoppingListAsync(householdId, cancellationToken);
        var parsed = IngredientNormalizer.ParseIngredient(ingredientName);
        var unitCanonical = IngredientNormalizer.CanonicalUnit(request.Unit);
        var existing = await dbContext.ShoppingListItems
            .Where(item =>
                item.HouseholdId == householdId
                && item.ShoppingListId == list.Id
                && item.CoreIngredientName == parsed.CoreName
                && item.State != ShoppingListItemStates.Purchased
                && item.State != ShoppingListItemStates.Skipped)
            .OrderBy(item => item.SortOrder)
            .FirstOrDefaultAsync(cancellationToken);

        if (existing is null || !IngredientNormalizer.AreUnitsCompatible(existing.UnitCanonical, unitCanonical))
        {
            return new MergePreviewResponse(false, null, null, null, request.Quantity, request.Quantity, request.Unit, ShoppingListItemStates.Needed, parsed.Preparation);
        }

        var mergedQuantity = existing.QuantityNeeded;
        if (request.Quantity is not null)
        {
            mergedQuantity = (mergedQuantity ?? 0m) + request.Quantity.Value;
        }

        return new MergePreviewResponse(
            true,
            existing.Id,
            existing.IngredientName,
            existing.QuantityNeeded,
            request.Quantity,
            mergedQuantity,
            existing.Unit ?? request.Unit,
            existing.State,
            MergeCommaSeparated(existing.Preparation, parsed.Preparation));
    }

    public async Task<CookingSessionResponse> StartCookingSessionAsync(
        Guid householdId,
        Guid? userId,
        StartCookingSessionRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        var plannedRecipes = await ResolveCookingStartRecipesAsync(householdId, request, cancellationToken);
        if (plannedRecipes.Count == 0)
        {
            throw new InvalidOperationException("A planned recipe or meal slot is required to start cooking.");
        }

        var sessionMode = string.Equals(request.PantryUpdateMode, PantryUpdateModes.ConfirmOnComplete, StringComparison.Ordinal)
            ? PantryUpdateModes.ConfirmOnComplete
            : PantryUpdateModes.Progressive;
        var firstRecipe = plannedRecipes[0];
        var session = new CookingSession
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            RecipeId = firstRecipe.RecipeId,
            RecipeRevisionId = firstRecipe.RecipeRevisionId,
            MealPlanSlotId = request.MealPlanSlotId,
            StartedByUserId = userId,
            Title = request.MealPlanSlotId is not null
                ? firstRecipe.MealTitle ?? BuildMealTitle(plannedRecipes.Select(item => item.Title).ToList())
                : firstRecipe.Title,
            PantryUpdateMode = sessionMode,
            StartedAtUtc = nowUtc,
            UpdatedAtUtc = nowUtc
        };

        var sessionRecipes = plannedRecipes
            .Select(item => new CookingSessionRecipe
            {
                Id = Guid.NewGuid(),
                CookingSessionId = session.Id,
                RecipeId = item.RecipeId,
                RecipeRevisionId = item.RecipeRevisionId,
                Role = item.Role,
                Position = item.Position,
                Title = item.Title,
                CurrentStepIndex = 0
            })
            .ToList();

        session.FocusedCookingSessionRecipeId = sessionRecipes[0].Id;
        dbContext.CookingSessions.Add(session);
        dbContext.CookingSessionRecipes.AddRange(sessionRecipes);

        foreach (var sessionRecipe in sessionRecipes)
        {
            var ingredients = await dbContext.RecipeIngredients
                .Where(item => item.RecipeRevisionId == sessionRecipe.RecipeRevisionId)
                .OrderBy(item => item.Position)
                .ToListAsync(cancellationToken);
            var steps = await dbContext.RecipeSteps
                .Where(item => item.RecipeRevisionId == sessionRecipe.RecipeRevisionId)
                .OrderBy(item => item.Position)
                .ToListAsync(cancellationToken);

            foreach (var ingredient in ingredients)
            {
                dbContext.CookingSessionIngredients.Add(new CookingSessionIngredient
                {
                    Id = Guid.NewGuid(),
                    CookingSessionId = session.Id,
                    CookingSessionRecipeId = sessionRecipe.Id,
                    RecipeIngredientId = ingredient.Id,
                    Position = ingredient.Position,
                    IngredientName = ingredient.IngredientName,
                    NormalizedIngredientName = ingredient.NormalizedIngredientName,
                    PlannedQuantity = ingredient.Quantity,
                    PlannedUnit = ingredient.Unit,
                    PantryDeductionStatus = sessionMode == PantryUpdateModes.ConfirmOnComplete
                        ? PantryDeductionStatuses.PendingConfirmation
                        : PantryDeductionStatuses.NotApplied
                });
            }

            foreach (var step in steps)
            {
                dbContext.CookingSessionSteps.Add(new CookingSessionStep
                {
                    Id = Guid.NewGuid(),
                    CookingSessionId = session.Id,
                    CookingSessionRecipeId = sessionRecipe.Id,
                    RecipeStepId = step.Id,
                    Position = step.Position,
                    Instruction = step.Instruction
                });
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return await GetCookingSessionAsync(householdId, session.Id, cancellationToken)
            ?? throw new InvalidOperationException("Cooking session could not be loaded.");
    }

    public async Task<CookingSessionResponse?> GetCookingSessionAsync(
        Guid householdId,
        Guid sessionId,
        CancellationToken cancellationToken)
    {
        var session = await dbContext.CookingSessions
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.HouseholdId == householdId && item.Id == sessionId, cancellationToken);
        if (session is null)
        {
            return null;
        }

        var sessionRecipes = await dbContext.CookingSessionRecipes
            .AsNoTracking()
            .Where(item => item.CookingSessionId == session.Id)
            .OrderBy(item => item.Position)
            .ToListAsync(cancellationToken);

        var ingredients = await dbContext.CookingSessionIngredients
            .AsNoTracking()
            .Where(item => item.CookingSessionId == session.Id)
            .OrderBy(item => item.Position)
            .ToListAsync(cancellationToken);
        var steps = await dbContext.CookingSessionSteps
            .AsNoTracking()
            .Where(item => item.CookingSessionId == session.Id)
            .OrderBy(item => item.Position)
            .ToListAsync(cancellationToken);
        if (sessionRecipes.Count == 0)
        {
            sessionRecipes =
            [
                new CookingSessionRecipe
                {
                    Id = Guid.Empty,
                    CookingSessionId = session.Id,
                    RecipeId = session.RecipeId,
                    RecipeRevisionId = session.RecipeRevisionId,
                    Role = MealRecipeRoles.Main,
                    Position = 1,
                    Title = session.Title,
                    CurrentStepIndex = session.CurrentStepIndex
                }
            ];
            ingredients = ingredients
                .Select(item => new CookingSessionIngredient
                {
                    Id = item.Id,
                    CookingSessionId = item.CookingSessionId,
                    CookingSessionRecipeId = Guid.Empty,
                    RecipeIngredientId = item.RecipeIngredientId,
                    Position = item.Position,
                    IngredientName = item.IngredientName,
                    NormalizedIngredientName = item.NormalizedIngredientName,
                    PlannedQuantity = item.PlannedQuantity,
                    PlannedUnit = item.PlannedUnit,
                    ActualQuantity = item.ActualQuantity,
                    ActualUnit = item.ActualUnit,
                    Notes = item.Notes,
                    IsChecked = item.IsChecked,
                    IsSkipped = item.IsSkipped,
                    PantryDeductedQuantity = item.PantryDeductedQuantity,
                    PantryDeductionStatus = item.PantryDeductionStatus
                })
                .ToList();
            steps = steps
                .Select(item => new CookingSessionStep
                {
                    Id = item.Id,
                    CookingSessionId = item.CookingSessionId,
                    CookingSessionRecipeId = Guid.Empty,
                    RecipeStepId = item.RecipeStepId,
                    Position = item.Position,
                    Instruction = item.Instruction,
                    Notes = item.Notes,
                    IsCompleted = item.IsCompleted
                })
                .ToList();
        }

        var focusedSessionRecipe = sessionRecipes.FirstOrDefault(item => item.Id == session.FocusedCookingSessionRecipeId)
            ?? sessionRecipes[0];

        var recipeResponses = sessionRecipes
            .Select(sessionRecipe =>
            {
                var recipeIngredients = ingredients
                    .Where(item => item.CookingSessionRecipeId == sessionRecipe.Id)
                    .OrderBy(item => item.Position)
                    .ToList();
                var recipeSteps = steps
                    .Where(item => item.CookingSessionRecipeId == sessionRecipe.Id)
                    .OrderBy(item => item.Position)
                    .ToList();
                var currentStep = recipeSteps.FirstOrDefault(step => step.Position == sessionRecipe.CurrentStepIndex + 1)
                    ?? recipeSteps.FirstOrDefault(step => !step.IsCompleted)
                    ?? recipeSteps.FirstOrDefault();
                var nextStep = currentStep is null
                    ? null
                    : recipeSteps.FirstOrDefault(step => step.Position == currentStep.Position + 1);
                var changeSuggestion = SummarizeRecipeChanges(recipeIngredients);

                return new CookingSessionRecipeResponse(
                    sessionRecipe.Id,
                    sessionRecipe.RecipeId,
                    sessionRecipe.RecipeRevisionId,
                    sessionRecipe.Role,
                    sessionRecipe.Title,
                    sessionRecipe.CurrentStepIndex,
                    currentStep?.Instruction,
                    nextStep?.Instruction,
                    changeSuggestion,
                    recipeIngredients.Select(item => new CookingSessionIngredientResponse(
                        item.Id,
                        item.CookingSessionRecipeId,
                        item.Position,
                        item.IngredientName,
                        item.PlannedQuantity,
                        item.PlannedUnit,
                        item.ActualQuantity,
                        item.ActualUnit,
                        item.Notes,
                        item.IsChecked,
                        item.IsSkipped,
                        item.PantryDeductedQuantity,
                        item.PantryDeductionStatus))
                    .ToList(),
                    recipeSteps.Select(item => new CookingSessionStepResponse(
                        item.Id,
                        item.CookingSessionRecipeId,
                        item.Position,
                        item.Instruction,
                        item.Notes,
                        item.IsCompleted))
                    .ToList());
            })
            .ToList();

        var focusedRecipeResponse = recipeResponses.FirstOrDefault(item => item.Id == focusedSessionRecipe.Id)
            ?? recipeResponses[0];
        var totalIngredients = BuildTotalIngredientResponses(ingredients);
        var pantryImpact = new PantryImpactPreviewResponse(
            session.PantryUpdateMode,
            ingredients.Count(item => string.Equals(item.PantryDeductionStatus, PantryDeductionStatuses.Applied, StringComparison.Ordinal)),
            ingredients.Count(item =>
                string.Equals(item.PantryDeductionStatus, PantryDeductionStatuses.Partial, StringComparison.Ordinal)
                || string.Equals(item.PantryDeductionStatus, PantryDeductionStatuses.PendingConfirmation, StringComparison.Ordinal)),
            ingredients.Select(item => new PantryImpactItemResponse(
                item.Id,
                item.IngredientName,
                item.PlannedQuantity,
                item.PlannedUnit,
                item.ActualQuantity,
                item.ActualUnit ?? item.PlannedUnit,
                item.PantryDeductedQuantity,
                item.PantryDeductionStatus))
            .ToList());

        var aggregateChanges = SummarizeRecipeChanges(ingredients);

        return new CookingSessionResponse(
            session.Id,
            session.MealPlanSlotId,
            session.Title,
            session.Status,
            session.PantryUpdateMode,
            focusedSessionRecipe.Id,
            focusedRecipeResponse.Title,
            recipeResponses.Count,
            focusedRecipeResponse.CurrentStepInstruction,
            focusedRecipeResponse.NextStepInstruction,
            aggregateChanges,
            pantryImpact,
            totalIngredients,
            recipeResponses);
    }

    public async Task<CookingSessionResponse?> UpdateCookingSessionAsync(
        Guid householdId,
        Guid sessionId,
        UpdateCookingSessionRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        var session = await dbContext.CookingSessions
            .FirstOrDefaultAsync(item => item.HouseholdId == householdId && item.Id == sessionId, cancellationToken);
        if (session is null)
        {
            return null;
        }

        if (request.FocusedCookingSessionRecipeId is not null)
        {
            var sessionRecipe = await dbContext.CookingSessionRecipes
                .FirstOrDefaultAsync(
                    item => item.CookingSessionId == sessionId && item.Id == request.FocusedCookingSessionRecipeId.Value,
                    cancellationToken);
            if (sessionRecipe is null)
            {
                return null;
            }

            session.FocusedCookingSessionRecipeId = sessionRecipe.Id;
            session.CurrentStepIndex = sessionRecipe.CurrentStepIndex;
            session.UpdatedAtUtc = nowUtc;
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return await GetCookingSessionAsync(householdId, sessionId, cancellationToken);
    }

    public async Task<CookingSessionResponse?> UpdateCookingIngredientAsync(
        Guid householdId,
        Guid sessionId,
        Guid sessionIngredientId,
        UpdateCookingIngredientRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        var session = await dbContext.CookingSessions
            .FirstOrDefaultAsync(item => item.HouseholdId == householdId && item.Id == sessionId, cancellationToken);
        if (session is null)
        {
            return null;
        }

        var ingredient = await dbContext.CookingSessionIngredients
            .FirstOrDefaultAsync(item => item.CookingSessionId == sessionId && item.Id == sessionIngredientId, cancellationToken);
        if (ingredient is null)
        {
            return null;
        }

        ingredient.IsChecked = request.IsChecked ?? ingredient.IsChecked;
        ingredient.IsSkipped = request.IsSkipped ?? ingredient.IsSkipped;
        if (request.IngredientName is not null)
        {
            var ingredientName = request.IngredientName.Trim();
            if (!string.IsNullOrWhiteSpace(ingredientName))
            {
                ingredient.IngredientName = ingredientName;
            }
        }

        ingredient.ActualQuantity = request.ActualQuantity ?? ingredient.ActualQuantity;
        ingredient.ActualUnit = request.ActualUnit is null ? ingredient.ActualUnit : CleanUnit(request.ActualUnit);
        ingredient.Notes = request.Notes is null ? ingredient.Notes : request.Notes.Trim();
        session.UpdatedAtUtc = nowUtc;

        if (session.PantryUpdateMode == PantryUpdateModes.Progressive)
        {
            await RebuildPantryAdjustmentsAsync(ingredient, nowUtc, cancellationToken);
        }
        else
        {
            await ReverseExistingAdjustmentsAsync(ingredient, nowUtc, cancellationToken);
            ingredient.PantryDeductionStatus =
                ingredient.IsChecked && !ingredient.IsSkipped
                    ? PantryDeductionStatuses.PendingConfirmation
                    : PantryDeductionStatuses.NotApplied;
            ingredient.PantryDeductedQuantity = 0;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return await GetCookingSessionAsync(householdId, sessionId, cancellationToken);
    }

    public async Task<CookingSessionResponse?> UpdateCookingStepAsync(
        Guid householdId,
        Guid sessionId,
        Guid sessionStepId,
        UpdateCookingStepRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        var session = await dbContext.CookingSessions
            .FirstOrDefaultAsync(item => item.HouseholdId == householdId && item.Id == sessionId, cancellationToken);
        if (session is null)
        {
            return null;
        }

        var step = await dbContext.CookingSessionSteps
            .FirstOrDefaultAsync(item => item.CookingSessionId == sessionId && item.Id == sessionStepId, cancellationToken);
        if (step is null)
        {
            return null;
        }

        var sessionRecipe = step.CookingSessionRecipeId is null
            ? null
            : await dbContext.CookingSessionRecipes
                .FirstOrDefaultAsync(item => item.Id == step.CookingSessionRecipeId.Value, cancellationToken);

        if (request.IsCompleted is not null)
        {
            step.IsCompleted = request.IsCompleted.Value;
        }

        if (request.Notes is not null)
        {
            step.Notes = request.Notes.Trim();
        }

        if (request.Instruction is not null)
        {
            var instruction = request.Instruction.Trim();
            if (!string.IsNullOrWhiteSpace(instruction))
            {
                step.Instruction = instruction;
            }
        }

        if (sessionRecipe is not null)
        {
            if (request.MakeCurrent == true)
            {
                sessionRecipe.CurrentStepIndex = Math.Max(0, step.Position - 1);
                session.FocusedCookingSessionRecipeId = sessionRecipe.Id;
                session.CurrentStepIndex = sessionRecipe.CurrentStepIndex;
            }
            else if (step.IsCompleted && sessionRecipe.CurrentStepIndex < step.Position)
            {
                sessionRecipe.CurrentStepIndex = step.Position;
                if (session.FocusedCookingSessionRecipeId == sessionRecipe.Id)
                {
                    session.CurrentStepIndex = sessionRecipe.CurrentStepIndex;
                }
            }
        }
        else if (request.MakeCurrent == true)
        {
            session.CurrentStepIndex = Math.Max(0, step.Position - 1);
        }
        else if (step.IsCompleted && session.CurrentStepIndex < step.Position)
        {
            session.CurrentStepIndex = step.Position;
        }

        session.UpdatedAtUtc = nowUtc;

        await dbContext.SaveChangesAsync(cancellationToken);
        return await GetCookingSessionAsync(householdId, sessionId, cancellationToken);
    }

    public async Task<CookingSessionResponse?> CompleteCookingSessionAsync(
        Guid householdId,
        Guid sessionId,
        CompleteCookingSessionRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        var session = await dbContext.CookingSessions
            .FirstOrDefaultAsync(item => item.HouseholdId == householdId && item.Id == sessionId, cancellationToken);
        if (session is null)
        {
            return null;
        }

        if (session.PantryUpdateMode == PantryUpdateModes.ConfirmOnComplete && request.ApplyPendingPantryDeductions)
        {
            var ingredients = await dbContext.CookingSessionIngredients
                .Where(item => item.CookingSessionId == sessionId)
                .OrderBy(item => item.Position)
                .ToListAsync(cancellationToken);

            foreach (var ingredient in ingredients)
            {
                await RebuildPantryAdjustmentsAsync(ingredient, nowUtc, cancellationToken);
            }
        }

        session.Status = CookingSessionStatuses.Completed;
        session.CompletedAtUtc = nowUtc;
        session.UpdatedAtUtc = nowUtc;

        await dbContext.SaveChangesAsync(cancellationToken);
        return await GetCookingSessionAsync(householdId, sessionId, cancellationToken);
    }

    public async Task<RecipeDetailResponse?> PromoteCookingSessionToRecipeAsync(
        Guid householdId,
        Guid sessionId,
        PromoteCookingSessionRecipeRequest request,
        Guid userId,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        var session = await dbContext.CookingSessions
            .FirstOrDefaultAsync(item => item.HouseholdId == householdId && item.Id == sessionId, cancellationToken);
        if (session is null)
        {
            return null;
        }

        var targetSessionRecipe = request.CookingSessionRecipeId is not null
            ? await dbContext.CookingSessionRecipes
                .FirstOrDefaultAsync(
                    item => item.CookingSessionId == sessionId && item.Id == request.CookingSessionRecipeId.Value,
                    cancellationToken)
            : await dbContext.CookingSessionRecipes
                .FirstOrDefaultAsync(
                    item => item.CookingSessionId == sessionId && item.Id == session.FocusedCookingSessionRecipeId,
                    cancellationToken)
                ?? await dbContext.CookingSessionRecipes
                    .Where(item => item.CookingSessionId == sessionId)
                    .OrderBy(item => item.Position)
                    .FirstOrDefaultAsync(cancellationToken);
        if (targetSessionRecipe is null && session.RecipeId != Guid.Empty)
        {
            targetSessionRecipe = new CookingSessionRecipe
            {
                Id = Guid.Empty,
                CookingSessionId = sessionId,
                RecipeId = session.RecipeId,
                RecipeRevisionId = session.RecipeRevisionId,
                Role = MealRecipeRoles.Main,
                Position = 1,
                Title = session.Title,
                CurrentStepIndex = session.CurrentStepIndex
            };
        }
        if (targetSessionRecipe is null)
        {
            return null;
        }

        var recipe = await dbContext.Recipes
            .FirstOrDefaultAsync(item => item.HouseholdId == householdId && item.Id == targetSessionRecipe.RecipeId, cancellationToken);
        if (recipe is null || recipe.CurrentRevisionId is null)
        {
            return null;
        }

        var currentRevision = await dbContext.RecipeRevisions
            .FirstAsync(item => item.Id == recipe.CurrentRevisionId.Value, cancellationToken);
        var existingIngredients = await dbContext.RecipeIngredients
            .Where(item => item.RecipeRevisionId == currentRevision.Id)
            .OrderBy(item => item.Position)
            .ToListAsync(cancellationToken);
        var existingSteps = await dbContext.RecipeSteps
            .Where(item => item.RecipeRevisionId == currentRevision.Id)
            .OrderBy(item => item.Position)
            .ToListAsync(cancellationToken);
        var sessionIngredients = await dbContext.CookingSessionIngredients
            .Where(item => targetSessionRecipe.Id == Guid.Empty
                ? item.CookingSessionId == sessionId
                : item.CookingSessionRecipeId == targetSessionRecipe.Id)
            .OrderBy(item => item.Position)
            .ToListAsync(cancellationToken);

        var hasMeaningfulChanges = sessionIngredients.Any(item =>
            item.ActualQuantity != item.PlannedQuantity
            || !string.Equals(item.ActualUnit ?? item.PlannedUnit, item.PlannedUnit, StringComparison.OrdinalIgnoreCase));
        if (!hasMeaningfulChanges)
        {
            return await BuildRecipeDetailAsync(recipe, cancellationToken);
        }

        var nextRevisionNumber = await dbContext.RecipeRevisions
            .Where(item => item.RecipeId == recipe.Id)
            .MaxAsync(item => item.RevisionNumber, cancellationToken) + 1;

        var promotedRevision = new RecipeRevision
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            RecipeId = recipe.Id,
            BasedOnRevisionId = currentRevision.Id,
            CreatedByUserId = userId,
            Kind = RecipeRevisionKinds.HouseholdDefault,
            RevisionNumber = nextRevisionNumber,
            Title = currentRevision.Title,
            Summary = currentRevision.Summary,
            YieldText = currentRevision.YieldText,
            Notes = currentRevision.Notes,
            Tags = currentRevision.Tags,
            CreatedAtUtc = nowUtc
        };

        dbContext.RecipeRevisions.Add(promotedRevision);

        foreach (var recipeIngredient in existingIngredients)
        {
            var sessionIngredient = sessionIngredients.FirstOrDefault(item => item.Position == recipeIngredient.Position);
            var quantity = sessionIngredient?.ActualQuantity ?? recipeIngredient.Quantity;
            var unit = sessionIngredient?.ActualUnit ?? recipeIngredient.Unit;

            dbContext.RecipeIngredients.Add(new RecipeIngredient
            {
                Id = Guid.NewGuid(),
                RecipeRevisionId = promotedRevision.Id,
                IngredientId = recipeIngredient.IngredientId,
                Position = recipeIngredient.Position,
                IngredientName = recipeIngredient.IngredientName,
                NormalizedIngredientName = recipeIngredient.NormalizedIngredientName,
                Quantity = quantity,
                Unit = unit,
                Preparation = recipeIngredient.Preparation,
                IsOptional = recipeIngredient.IsOptional
            });
        }

        foreach (var recipeStep in existingSteps)
        {
            dbContext.RecipeSteps.Add(new RecipeStep
            {
                Id = Guid.NewGuid(),
                RecipeRevisionId = promotedRevision.Id,
                Position = recipeStep.Position,
                Instruction = recipeStep.Instruction
            });
        }

        recipe.CurrentRevisionId = promotedRevision.Id;
        recipe.UpdatedAtUtc = nowUtc;

        await dbContext.SaveChangesAsync(cancellationToken);
        return await BuildRecipeDetailAsync(recipe, cancellationToken);
    }

    public async Task<TvCookingDisplayResponse?> GetTvCookingDisplayAsync(
        Guid householdId,
        Guid sessionId,
        CancellationToken cancellationToken)
    {
        var session = await GetCookingSessionAsync(householdId, sessionId, cancellationToken);
        if (session is null)
        {
            return null;
        }

        var focusedRecipe = session.Recipes.FirstOrDefault(item => item.Id == session.FocusedCookingSessionRecipeId)
            ?? session.Recipes[0];

        return new TvCookingDisplayResponse(
            session.Id,
            session.Title,
            focusedRecipe.Title,
            session.Recipes.Select(item => item.Title).ToList(),
            focusedRecipe.CurrentStepIndex,
            focusedRecipe.Steps.Count,
            focusedRecipe.CurrentStepInstruction,
            focusedRecipe.NextStepInstruction,
            focusedRecipe.Ingredients
                .Where(item => !item.IsChecked && !item.IsSkipped)
                .Select(FormatIngredientLine)
                .ToList(),
            focusedRecipe.Ingredients
                .Where(item => item.IsChecked && !item.IsSkipped)
                .Select(FormatIngredientLine)
                .ToList(),
            focusedRecipe.Steps
                .Where(step => step.Position > focusedRecipe.CurrentStepIndex)
                .Select(step => step.Instruction)
                .ToList());
    }

    private async Task<IReadOnlyList<RecipeSummaryResponse>> BuildRecipeSummariesAsync(
        Guid householdId,
        string? query,
        int? take,
        CancellationToken cancellationToken)
    {
        var recipesQuery = dbContext.Recipes
            .Where(recipe => recipe.HouseholdId == householdId);

        if (!string.IsNullOrWhiteSpace(query))
        {
            var normalizedQuery = query.Trim().ToLowerInvariant();
            recipesQuery = recipesQuery.Where(recipe =>
                recipe.Title.ToLower().Contains(normalizedQuery)
                || (recipe.Summary != null && recipe.Summary.ToLower().Contains(normalizedQuery))
                || (recipe.Tags != null && recipe.Tags.ToLower().Contains(normalizedQuery)));
        }

        var recipes = await (take is null
                ? recipesQuery.OrderByDescending(recipe => recipe.UpdatedAtUtc)
                : recipesQuery.OrderByDescending(recipe => recipe.UpdatedAtUtc).Take(take.Value))
            .ToListAsync(cancellationToken);

        if (recipes.Count == 0)
        {
            return [];
        }

        var recipeIds = recipes.Select(recipe => recipe.Id).ToList();
        var revisionIds = recipes
            .Where(recipe => recipe.CurrentRevisionId != null)
            .Select(recipe => recipe.CurrentRevisionId!.Value)
            .ToList();

        var ingredientCounts = await dbContext.RecipeIngredients
            .Where(ingredient => revisionIds.Contains(ingredient.RecipeRevisionId))
            .GroupBy(ingredient => ingredient.RecipeRevisionId)
            .Select(group => new { group.Key, Count = group.Count() })
            .ToDictionaryAsync(group => group.Key, group => group.Count, cancellationToken);

        var stepCounts = await dbContext.RecipeSteps
            .Where(step => revisionIds.Contains(step.RecipeRevisionId))
            .GroupBy(step => step.RecipeRevisionId)
            .Select(group => new { group.Key, Count = group.Count() })
            .ToDictionaryAsync(group => group.Key, group => group.Count, cancellationToken);

        var sourceMap = await dbContext.RecipeSources
            .Where(source => source.HouseholdId == householdId && source.RecipeId != null && recipeIds.Contains(source.RecipeId.Value))
            .ToDictionaryAsync(source => source.RecipeId!.Value, cancellationToken);

        var revisionMap = await dbContext.RecipeRevisions
            .Where(revision => revision.HouseholdId == householdId && revisionIds.Contains(revision.Id))
            .ToDictionaryAsync(revision => revision.Id, cancellationToken);

        return recipes
            .Select(recipe =>
            {
                var revision = recipe.CurrentRevisionId is not null && revisionMap.TryGetValue(recipe.CurrentRevisionId.Value, out var currentRevision)
                    ? currentRevision
                    : null;
                sourceMap.TryGetValue(recipe.Id, out var source);

                return new RecipeSummaryResponse(
                    recipe.Id,
                    recipe.Title,
                    recipe.Summary,
                    recipe.Tags,
                    revision?.YieldText,
                    source?.SourceSiteName ?? source?.SourceTitle,
                    recipe.ImportedSourceRevisionId is not null,
                    recipe.CurrentRevisionId is not null && ingredientCounts.TryGetValue(recipe.CurrentRevisionId.Value, out var ingredientCount)
                        ? ingredientCount
                        : 0,
                    recipe.CurrentRevisionId is not null && stepCounts.TryGetValue(recipe.CurrentRevisionId.Value, out var stepCount)
                        ? stepCount
                        : 0,
                    recipe.UpdatedAtUtc);
            })
            .ToList();
    }

    private async Task<IReadOnlyList<CookingSessionSummaryResponse>> BuildCookingSessionSummariesAsync(
        IReadOnlyList<CookingSession> sessions,
        CancellationToken cancellationToken)
    {
        if (sessions.Count == 0)
        {
            return [];
        }

        var sessionIds = sessions.Select(session => session.Id).ToList();
        var sessionRecipes = await dbContext.CookingSessionRecipes
            .Where(item => sessionIds.Contains(item.CookingSessionId))
            .ToListAsync(cancellationToken);
        var recipeCounts = sessionRecipes
            .GroupBy(item => item.CookingSessionId)
            .ToDictionary(group => group.Key, group => group.Count());
        var focusedTitles = sessionRecipes
            .ToDictionary(item => item.Id, item => item.Title);

        var sessionIngredientStats = await dbContext.CookingSessionIngredients
            .Where(ingredient => sessionIds.Contains(ingredient.CookingSessionId))
            .GroupBy(ingredient => ingredient.CookingSessionId)
            .Select(group => new
            {
                group.Key,
                CheckedCount = group.Count(ingredient => ingredient.IsChecked || ingredient.IsSkipped),
                TotalCount = group.Count()
            })
            .ToDictionaryAsync(group => group.Key, group => (group.CheckedCount, group.TotalCount), cancellationToken);

        var sessionStepCounts = await dbContext.CookingSessionSteps
            .Where(step => sessionIds.Contains(step.CookingSessionId))
            .GroupBy(step => step.CookingSessionId)
            .Select(group => new { group.Key, Count = group.Count() })
            .ToDictionaryAsync(group => group.Key, group => group.Count, cancellationToken);

        return sessions
            .Select(session =>
            {
                sessionIngredientStats.TryGetValue(session.Id, out var ingredientStats);
                sessionStepCounts.TryGetValue(session.Id, out var stepCount);
                var focusedTitle = session.FocusedCookingSessionRecipeId is not null
                    && focusedTitles.TryGetValue(session.FocusedCookingSessionRecipeId.Value, out var title)
                    ? title
                    : session.Title;

                return new CookingSessionSummaryResponse(
                    session.Id,
                    session.MealPlanSlotId,
                    session.Title,
                    session.Status,
                    session.PantryUpdateMode,
                    recipeCounts.TryGetValue(session.Id, out var recipeCount) ? recipeCount : 1,
                    focusedTitle,
                    session.CurrentStepIndex,
                    stepCount,
                    ingredientStats.CheckedCount,
                    ingredientStats.TotalCount,
                    session.StartedAtUtc);
            })
            .ToList();
    }

    private async Task<RecipeDetailResponse> BuildRecipeDetailAsync(
        Recipe recipe,
        CancellationToken cancellationToken)
    {
        if (recipe.ImportedSourceRevisionId is null || recipe.CurrentRevisionId is null)
        {
            throw new InvalidOperationException("Recipe lineage is incomplete.");
        }

        var source = await dbContext.RecipeSources
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == recipe.SourceId, cancellationToken);
        var revisions = await dbContext.RecipeRevisions
            .AsNoTracking()
            .Where(item => item.RecipeId == recipe.Id)
            .OrderBy(item => item.RevisionNumber)
            .ToListAsync(cancellationToken);
        var revisionIds = revisions.Select(revision => revision.Id).ToList();
        var ingredients = await dbContext.RecipeIngredients
            .AsNoTracking()
            .Where(item => revisionIds.Contains(item.RecipeRevisionId))
            .OrderBy(item => item.Position)
            .ToListAsync(cancellationToken);
        var steps = await dbContext.RecipeSteps
            .AsNoTracking()
            .Where(item => revisionIds.Contains(item.RecipeRevisionId))
            .OrderBy(item => item.Position)
            .ToListAsync(cancellationToken);

        var importedRevision = revisions.Single(item => item.Id == recipe.ImportedSourceRevisionId.Value);
        var householdRevision = revisions.Single(item => item.Id == recipe.CurrentRevisionId.Value);

        return new RecipeDetailResponse(
            recipe.Id,
            recipe.Title,
            recipe.Summary,
            recipe.Tags,
            householdRevision.YieldText,
            householdRevision.Notes,
            source is null
                ? null
                : new RecipeSourceResponse(
                    source.Id,
                    source.Kind,
                    source.SourceUrl,
                    source.SourceTitle,
                    source.SourceSiteName,
                    source.Attribution),
            ToRecipeRevisionResponse(importedRevision, ingredients, steps),
            ToRecipeRevisionResponse(householdRevision, ingredients, steps),
            revisions.Count,
            recipe.UpdatedAtUtc);
    }

    private static RecipeRevisionResponse ToRecipeRevisionResponse(
        RecipeRevision revision,
        IReadOnlyList<RecipeIngredient> ingredients,
        IReadOnlyList<RecipeStep> steps) =>
        new(
            revision.Id,
            revision.Kind,
            revision.RevisionNumber,
            revision.Title,
            revision.Summary,
            revision.YieldText,
            revision.Notes,
            revision.Tags,
            ingredients
                .Where(item => item.RecipeRevisionId == revision.Id)
                .OrderBy(item => item.Position)
                .Select(item => new RecipeEditableIngredientResponse(
                    item.IngredientName,
                    item.Quantity,
                    item.Unit,
                    item.Preparation,
                    item.IsOptional))
                .ToList(),
            steps
                .Where(item => item.RecipeRevisionId == revision.Id)
                .OrderBy(item => item.Position)
                .Select(item => new RecipeEditableStepResponse(item.Position, item.Instruction))
                .ToList());

    private async Task CreateRecipeRevisionContentAsync(
        Guid revisionId,
        Guid householdId,
        IReadOnlyList<RecipeEditableIngredientRequest> ingredients,
        IReadOnlyList<RecipeEditableStepRequest> steps,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        var position = 1;
        foreach (var ingredientRequest in ingredients)
        {
            var ingredientName = ingredientRequest.IngredientName!.Trim();
            var ingredient = await FindOrCreateIngredientAsync(
                householdId,
                ingredientName,
                ingredientRequest.Unit,
                nowUtc,
                cancellationToken);

            dbContext.RecipeIngredients.Add(new RecipeIngredient
            {
                Id = Guid.NewGuid(),
                RecipeRevisionId = revisionId,
                IngredientId = ingredient.Id,
                Position = position++,
                IngredientName = ingredientName,
                NormalizedIngredientName = ingredient.NormalizedName,
                Quantity = ingredientRequest.Quantity,
                Unit = CleanUnit(ingredientRequest.Unit),
                Preparation = ingredientRequest.Preparation?.Trim(),
                IsOptional = ingredientRequest.IsOptional
            });
        }

        position = 1;
        foreach (var stepRequest in steps)
        {
            dbContext.RecipeSteps.Add(new RecipeStep
            {
                Id = Guid.NewGuid(),
                RecipeRevisionId = revisionId,
                Position = position++,
                Instruction = stepRequest.Instruction!.Trim()
            });
        }
    }

    private async Task<IReadOnlyList<MealPlanSlotResponse>> BuildMealPlanSlotResponsesAsync(
        Guid householdId,
        IReadOnlyList<MealPlanSlot> slots,
        IReadOnlyList<ShoppingListItem> activeShoppingItems,
        CancellationToken cancellationToken)
    {
        if (slots.Count == 0)
        {
            return [];
        }

        var slotIds = slots.Select(slot => slot.Id).ToList();
        var mealPlanRecipes = await dbContext.MealPlanRecipes
            .Where(item => slotIds.Contains(item.MealPlanSlotId))
            .OrderBy(item => item.Position)
            .ToListAsync(cancellationToken);
        var legacyRecipeIds = slots
            .Where(slot => slot.RecipeId is not null)
            .Select(slot => slot.RecipeId!.Value)
            .Distinct()
            .ToList();
        var legacyRecipeMap = legacyRecipeIds.Count == 0
            ? new Dictionary<Guid, Recipe>()
            : await dbContext.Recipes
                .Where(item => legacyRecipeIds.Contains(item.Id))
                .ToDictionaryAsync(item => item.Id, cancellationToken);
        var recipeGroups = mealPlanRecipes
            .GroupBy(item => item.MealPlanSlotId)
            .ToDictionary(group => group.Key, group => group.ToList());
        var revisionIds = mealPlanRecipes
            .Select(item => item.RecipeRevisionId)
            .Concat(legacyRecipeMap.Values.Where(item => item.CurrentRevisionId is not null).Select(item => item.CurrentRevisionId!.Value))
            .Distinct()
            .ToList();
        var recipeIngredients = revisionIds.Count == 0
            ? []
            : await dbContext.RecipeIngredients
                .Where(item => revisionIds.Contains(item.RecipeRevisionId))
                .OrderBy(item => item.Position)
                .ToListAsync(cancellationToken);

        return slots
            .Select(slot =>
            {
                recipeGroups.TryGetValue(slot.Id, out var slotRecipes);
                if ((slotRecipes is null || slotRecipes.Count == 0)
                    && slot.RecipeId is not null
                    && legacyRecipeMap.TryGetValue(slot.RecipeId.Value, out var legacyRecipe)
                    && legacyRecipe.CurrentRevisionId is not null)
                {
                    slotRecipes =
                    [
                        new MealPlanRecipe
                        {
                            Id = Guid.Empty,
                            MealPlanSlotId = slot.Id,
                            RecipeId = legacyRecipe.Id,
                            RecipeRevisionId = legacyRecipe.CurrentRevisionId.Value,
                            Role = MealRecipeRoles.Main,
                            Position = 1,
                            RecipeTitleSnapshot = legacyRecipe.Title,
                            CreatedAtUtc = slot.CreatedAtUtc
                        }
                    ];
                }

                return ToMealPlanSlotResponse(slot, slotRecipes ?? [], recipeIngredients, activeShoppingItems);
            })
            .ToList();
    }

    private static MealPlanSlotResponse ToMealPlanSlotResponse(
        MealPlanSlot slot,
        IReadOnlyList<MealPlanRecipe> mealPlanRecipes,
        IReadOnlyList<RecipeIngredient> recipeIngredients,
        IReadOnlyList<ShoppingListItem> activeShoppingItems)
    {
        var recipeResponses = mealPlanRecipes
            .OrderBy(item => item.Position)
            .Select(item => new MealPlanRecipeResponse(
                item.Id,
                item.RecipeId,
                item.RecipeRevisionId,
                item.Role,
                item.RecipeTitleSnapshot))
            .ToList();

        var title = !string.IsNullOrWhiteSpace(slot.Title)
            ? slot.Title
            : recipeResponses.Count > 0
                ? BuildMealTitle(recipeResponses.Select(item => item.Title).ToList())
                : slot.RecipeTitleSnapshot ?? slot.SlotName;

        var matchingShoppingItems = activeShoppingItems
            .Where(item =>
                item.State != ShoppingListItemStates.Purchased
                && item.State != ShoppingListItemStates.Skipped
                && (item.SourceMealPlanSlotId == slot.Id
                    || (!string.IsNullOrWhiteSpace(slot.Title)
                        && string.Equals(item.SourceMealTitle, slot.Title, StringComparison.OrdinalIgnoreCase))
                    || (!string.IsNullOrWhiteSpace(title)
                        && !string.IsNullOrWhiteSpace(item.SourceMealTitles)
                        && item.SourceMealTitles.Contains(title, StringComparison.OrdinalIgnoreCase))))
            .ToList();
        var shoppingDraftCount = BuildShoppingDrafts(slot, mealPlanRecipes, recipeIngredients).Count;

        return new MealPlanSlotResponse(
            slot.Id,
            slot.Date,
            slot.SlotName,
            title,
            slot.Notes,
            matchingShoppingItems.Count,
            shoppingDraftCount,
            recipeResponses);
    }

    private async Task<List<ShoppingListItem>> AddMissingIngredientsToDefaultShoppingListAsync(
        Guid householdId,
        Guid mealPlanSlotId,
        bool pantryAware,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        await EnsureDefaultFoodSetupAsync(householdId, cancellationToken);
        var slot = await dbContext.MealPlanSlots
            .FirstOrDefaultAsync(item => item.HouseholdId == householdId && item.Id == mealPlanSlotId, cancellationToken)
            ?? throw new InvalidOperationException("Meal plan slot could not be found.");
        var mealPlanRecipes = await dbContext.MealPlanRecipes
            .Where(item => item.MealPlanSlotId == slot.Id)
            .OrderBy(item => item.Position)
            .ToListAsync(cancellationToken);
        if (mealPlanRecipes.Count == 0 && slot.RecipeId is not null)
        {
            var legacyRecipe = await dbContext.Recipes
                .FirstOrDefaultAsync(item => item.HouseholdId == householdId && item.Id == slot.RecipeId.Value, cancellationToken)
                ?? throw new InvalidOperationException("Meal plan slot could not be resolved into recipes.");
            if (legacyRecipe.CurrentRevisionId is null)
            {
                throw new InvalidOperationException("Meal plan slot recipe is missing a household-default revision.");
            }

            mealPlanRecipes =
            [
                new MealPlanRecipe
                {
                    Id = Guid.Empty,
                    MealPlanSlotId = slot.Id,
                    RecipeId = legacyRecipe.Id,
                    RecipeRevisionId = legacyRecipe.CurrentRevisionId.Value,
                    Role = MealRecipeRoles.Main,
                    Position = 1,
                    RecipeTitleSnapshot = legacyRecipe.Title,
                    CreatedAtUtc = slot.CreatedAtUtc
                }
            ];
        }
        var revisionIds = mealPlanRecipes.Select(item => item.RecipeRevisionId).Distinct().ToList();
        var ingredients = await dbContext.RecipeIngredients
            .Where(item => revisionIds.Contains(item.RecipeRevisionId))
            .OrderBy(item => item.Position)
            .ToListAsync(cancellationToken);
        var shoppingDrafts = BuildShoppingDrafts(slot, mealPlanRecipes, ingredients);
        var createdOrUpdated = new List<ShoppingListItem>();
        foreach (var draft in shoppingDrafts)
        {
            var item = await UpsertShoppingItemAsync(householdId, draft, pantryAware, forceSeparate: false, nowUtc, cancellationToken);
            if (!createdOrUpdated.Contains(item))
            {
                createdOrUpdated.Add(item);
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return createdOrUpdated;
    }

    private async Task<TonightCookViewResponse?> BuildTonightCookViewAsync(
        Guid householdId,
        CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        var slot = await dbContext.MealPlanSlots
            .Where(item => item.HouseholdId == householdId && item.Date == today)
            .OrderBy(item => item.SlotName)
            .FirstOrDefaultAsync(cancellationToken);
        if (slot is null)
        {
            return null;
        }

        var mealPlanRecipes = await dbContext.MealPlanRecipes
            .Where(item => item.MealPlanSlotId == slot.Id)
            .OrderBy(item => item.Position)
            .ToListAsync(cancellationToken);
        if (mealPlanRecipes.Count == 0 && slot.RecipeId is not null)
        {
            var legacyRecipe = await dbContext.Recipes
                .FirstOrDefaultAsync(item => item.HouseholdId == householdId && item.Id == slot.RecipeId.Value, cancellationToken);
            if (legacyRecipe?.CurrentRevisionId is not null)
            {
                mealPlanRecipes =
                [
                    new MealPlanRecipe
                    {
                        Id = Guid.Empty,
                        MealPlanSlotId = slot.Id,
                        RecipeId = legacyRecipe.Id,
                        RecipeRevisionId = legacyRecipe.CurrentRevisionId.Value,
                        Role = MealRecipeRoles.Main,
                        Position = 1,
                        RecipeTitleSnapshot = legacyRecipe.Title,
                        CreatedAtUtc = slot.CreatedAtUtc
                    }
                ];
            }
        }
        if (mealPlanRecipes.Count == 0)
        {
            return null;
        }

        var revisionIds = mealPlanRecipes.Select(item => item.RecipeRevisionId).Distinct().ToList();
        var ingredients = await dbContext.RecipeIngredients
            .Where(item => revisionIds.Contains(item.RecipeRevisionId))
            .ToListAsync(cancellationToken);
        var pantryItems = await dbContext.PantryItems
            .Where(item => item.HouseholdId == householdId)
            .ToListAsync(cancellationToken);

        var shoppingDrafts = BuildShoppingDrafts(slot, mealPlanRecipes, ingredients);
        var missing = new List<string>();
        foreach (var draft in shoppingDrafts)
        {
            var pantryMatches = pantryItems.Where(item =>
                item.NormalizedIngredientName == draft.NormalizedIngredientName
                && UnitsCompatible(item.Unit, draft.Unit));
            var available = pantryMatches.Sum(item => item.Quantity ?? 0m);

            if (draft.Quantity is null && !pantryMatches.Any())
            {
                missing.Add(draft.IngredientName);
                continue;
            }

            if (draft.Quantity is not null && available < draft.Quantity.Value)
            {
                missing.Add(draft.IngredientName);
            }
        }

        var plannedRecipeTitles = mealPlanRecipes
            .OrderBy(item => item.Position)
            .Select(item => item.RecipeTitleSnapshot)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        return new TonightCookViewResponse(
            slot.Id,
            string.IsNullOrWhiteSpace(slot.Title) ? BuildMealTitle(plannedRecipeTitles) : slot.Title,
            missing.Count == 0
                ? "Planned for today and mostly covered by pantry."
                : "Planned for today with a few shopping gaps to close.",
            missing.Count,
            missing.Distinct(StringComparer.OrdinalIgnoreCase).ToList(),
            plannedRecipeTitles);
    }

    private async Task RebuildPantryAdjustmentsAsync(
        CookingSessionIngredient ingredient,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        await ReverseExistingAdjustmentsAsync(ingredient, nowUtc, cancellationToken);

        if (!ingredient.IsChecked || ingredient.IsSkipped)
        {
            ingredient.PantryDeductionStatus = PantryDeductionStatuses.NotApplied;
            ingredient.PantryDeductedQuantity = 0;
            return;
        }

        var targetQuantity = ingredient.ActualQuantity ?? ingredient.PlannedQuantity;
        if (targetQuantity is null || targetQuantity <= 0)
        {
            ingredient.PantryDeductionStatus = PantryDeductionStatuses.NotApplied;
            ingredient.PantryDeductedQuantity = 0;
            return;
        }

        var desiredUnit = CleanUnit(ingredient.ActualUnit ?? ingredient.PlannedUnit);
        var session = await dbContext.CookingSessions
            .FirstAsync(item => item.Id == ingredient.CookingSessionId, cancellationToken);

        var matchingPantryItems = (await dbContext.PantryItems
            .Where(item =>
                item.HouseholdId == session.HouseholdId
                && item.NormalizedIngredientName == ingredient.NormalizedIngredientName)
            .OrderBy(item => item.ExpiresAtUtc ?? DateTimeOffset.MaxValue)
            .ThenBy(item => item.UpdatedAtUtc)
            .ToListAsync(cancellationToken))
            .Where(item => UnitsCompatible(item.Unit, desiredUnit))
            .ToList();

        decimal remaining = targetQuantity.Value;
        decimal applied = 0;
        foreach (var pantryItem in matchingPantryItems)
        {
            if (remaining <= 0)
            {
                break;
            }

            if (pantryItem.Quantity is null || pantryItem.Quantity <= 0)
            {
                continue;
            }

            var delta = Math.Min(pantryItem.Quantity.Value, remaining);
            pantryItem.Quantity -= delta;
            pantryItem.Status = ComputePantryStatus(pantryItem.Quantity, pantryItem.LowThreshold);
            pantryItem.UpdatedAtUtc = nowUtc;
            remaining -= delta;
            applied += delta;

            dbContext.CookingSessionPantryAdjustments.Add(new CookingSessionPantryAdjustment
            {
                Id = Guid.NewGuid(),
                CookingSessionIngredientId = ingredient.Id,
                PantryItemId = pantryItem.Id,
                QuantityDelta = delta,
                Unit = pantryItem.Unit,
                AppliedAtUtc = nowUtc
            });

            RecordPantryItemActivity(
                session.HouseholdId,
                pantryItem,
                PantryItemActivityKinds.CookingDeduction,
                -delta,
                pantryItem.Quantity,
                pantryItem.Unit,
                null,
                ingredient.IngredientName,
                nowUtc);
        }

        ingredient.PantryDeductedQuantity = applied;
        ingredient.PantryDeductionStatus = applied switch
        {
            0 => PantryDeductionStatuses.Partial,
            _ when applied >= targetQuantity.Value => PantryDeductionStatuses.Applied,
            _ => PantryDeductionStatuses.Partial
        };
    }

    private async Task ReverseExistingAdjustmentsAsync(
        CookingSessionIngredient ingredient,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        var adjustments = await dbContext.CookingSessionPantryAdjustments
            .Where(item => item.CookingSessionIngredientId == ingredient.Id)
            .ToListAsync(cancellationToken);

        if (adjustments.Count == 0)
        {
            return;
        }

        var pantryItemIds = adjustments.Select(item => item.PantryItemId).ToList();
        var pantryItems = await dbContext.PantryItems
            .Where(item => pantryItemIds.Contains(item.Id))
            .ToDictionaryAsync(item => item.Id, cancellationToken);

        foreach (var adjustment in adjustments)
        {
            if (!pantryItems.TryGetValue(adjustment.PantryItemId, out var pantryItem))
            {
                continue;
            }

            pantryItem.Quantity = (pantryItem.Quantity ?? 0m) + adjustment.QuantityDelta;
            pantryItem.Status = ComputePantryStatus(pantryItem.Quantity, pantryItem.LowThreshold);
            pantryItem.UpdatedAtUtc = nowUtc;

            RecordPantryItemActivity(
                pantryItem.HouseholdId,
                pantryItem,
                PantryItemActivityKinds.CookingReversal,
                adjustment.QuantityDelta,
                pantryItem.Quantity,
                pantryItem.Unit,
                null,
                ingredient.IngredientName,
                nowUtc);
        }

        dbContext.CookingSessionPantryAdjustments.RemoveRange(adjustments);
    }

    private async Task EnsureDefaultFoodSetupAsync(Guid householdId, CancellationToken cancellationToken)
    {
        if (!await dbContext.PantryLocations.AnyAsync(item => item.HouseholdId == householdId, cancellationToken))
        {
            dbContext.PantryLocations.AddRange(
                new PantryLocation
                {
                    Id = Guid.NewGuid(),
                    HouseholdId = householdId,
                    Name = "Pantry",
                    SortOrder = 1,
                    CreatedAtUtc = DateTimeOffset.UtcNow
                },
                new PantryLocation
                {
                    Id = Guid.NewGuid(),
                    HouseholdId = householdId,
                    Name = "Fridge",
                    SortOrder = 2,
                    CreatedAtUtc = DateTimeOffset.UtcNow
                },
                new PantryLocation
                {
                    Id = Guid.NewGuid(),
                    HouseholdId = householdId,
                    Name = "Freezer",
                    SortOrder = 3,
                    CreatedAtUtc = DateTimeOffset.UtcNow
                });
        }

        if (!await dbContext.ShoppingLists.AnyAsync(item => item.HouseholdId == householdId, cancellationToken))
        {
            dbContext.ShoppingLists.Add(new ShoppingList
            {
                Id = Guid.NewGuid(),
                HouseholdId = householdId,
                Name = "Main grocery list",
                IsDefault = true,
                CreatedAtUtc = DateTimeOffset.UtcNow
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<ShoppingList> GetOrCreateDefaultShoppingListAsync(Guid householdId, CancellationToken cancellationToken)
    {
        var activeShoppingLists = await dbContext.ShoppingLists
            .Where(item =>
                item.HouseholdId == householdId
                && item.IsDefault
                && item.Status == ShoppingListStatuses.Active)
            .OrderBy(item => item.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        if (activeShoppingLists.Count > 0)
        {
            return activeShoppingLists[0];
        }

        var shoppingList = await dbContext.ShoppingLists
            .FirstOrDefaultAsync(item => item.HouseholdId == householdId && item.IsDefault, cancellationToken);
        if (shoppingList is not null)
        {
            shoppingList.Status = ShoppingListStatuses.Active;
            shoppingList.CompletedAtUtc = null;
            shoppingList.ArchivedAtUtc = null;
            shoppingList.CompletedByUserId = null;
            await dbContext.SaveChangesAsync(cancellationToken);
            return shoppingList;
        }

        shoppingList = new ShoppingList
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            Name = "Main grocery list",
            IsDefault = true,
            Status = ShoppingListStatuses.Active,
            CreatedAtUtc = DateTimeOffset.UtcNow
        };

        dbContext.ShoppingLists.Add(shoppingList);
        await dbContext.SaveChangesAsync(cancellationToken);
        return shoppingList;
    }

    private async Task<FoodIngredient> FindOrCreateIngredientAsync(
        Guid householdId,
        string ingredientName,
        string? unit,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        var normalizedName = IngredientNormalizer.NormalizeName(ingredientName);
        var trackedIngredient = dbContext.FoodIngredients.Local
            .FirstOrDefault(item =>
                item.HouseholdId == householdId
                && string.Equals(item.NormalizedName, normalizedName, StringComparison.Ordinal));

        if (trackedIngredient is not null)
        {
            return trackedIngredient;
        }

        var ingredient = await dbContext.FoodIngredients
            .FirstOrDefaultAsync(
                item => item.HouseholdId == householdId && item.NormalizedName == normalizedName,
                cancellationToken);

        if (ingredient is not null)
        {
            return ingredient;
        }

        ingredient = new FoodIngredient
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            Name = ingredientName.Trim(),
            NormalizedName = normalizedName,
            DefaultUnit = IngredientNormalizer.CanonicalUnit(unit),
            CreatedAtUtc = nowUtc
        };

        dbContext.FoodIngredients.Add(ingredient);
        return ingredient;
    }

    private static PantryItemResponse ToPantryItemResponse(PantryItem item, string? locationName) =>
        new(
            item.Id,
            item.IngredientId,
            item.PantryLocationId,
            item.IngredientName,
            locationName,
            item.Quantity,
            item.Unit,
            item.LowThreshold,
            item.Status,
            item.PurchasedAtUtc,
            item.ExpiresAtUtc,
            item.UpdatedAtUtc);

    private static ShoppingListItemResponse ToShoppingListItemResponse(ShoppingListItem item) =>
        new(
            item.Id,
            item.IngredientName,
            item.CoreIngredientName,
            item.Preparation,
            item.QuantityNeeded,
            item.QuantityPurchased,
            item.Unit,
            item.UnitCanonical,
            item.Notes,
            item.SourceRecipeTitle,
            item.SourceMealTitle,
            item.SourceRecipeIds,
            item.SourceMealTitles,
            item.SourceMealPlanSlotId,
            item.State,
            item.IsCompleted,
            item.SortOrder,
            item.AisleCategory,
            item.ClaimedByUserId,
            item.ClaimedAtUtc,
            item.CreatedAtUtc,
            item.CompletedAtUtc);

    private static string FormatIngredientLine(CookingSessionIngredientResponse ingredient)
    {
        var quantity = ingredient.ActualQuantity ?? ingredient.PlannedQuantity;
        var unit = ingredient.ActualUnit ?? ingredient.PlannedUnit;
        var quantityText = quantity is null ? string.Empty : quantity.Value.ToString("0.##", CultureInfo.InvariantCulture) + " ";
        var unitText = string.IsNullOrWhiteSpace(unit) ? string.Empty : unit + " ";
        return $"{quantityText}{unitText}{ingredient.IngredientName}".Trim();
    }

    private static RecipeContent ValidateRecipeContent(
        string? title,
        string? summary,
        string? yieldText,
        string? tags,
        string? notes,
        IReadOnlyList<RecipeEditableIngredientRequest>? ingredients,
        IReadOnlyList<RecipeEditableStepRequest>? steps)
    {
        var cleanTitle = title?.Trim();
        if (string.IsNullOrWhiteSpace(cleanTitle))
        {
            throw new InvalidOperationException("Recipe title is required.");
        }

        var ingredientRequests = ingredients?
            .Where(item => !string.IsNullOrWhiteSpace(item.IngredientName))
            .ToList() ?? [];
        var stepRequests = steps?
            .Where(step => !string.IsNullOrWhiteSpace(step.Instruction))
            .OrderBy(step => step.Position)
            .ToList() ?? [];

        if (ingredientRequests.Count == 0)
        {
            throw new InvalidOperationException("At least one ingredient is required.");
        }

        if (stepRequests.Count == 0)
        {
            throw new InvalidOperationException("At least one step is required.");
        }

        return new RecipeContent(
            cleanTitle,
            string.IsNullOrWhiteSpace(summary) ? null : summary.Trim(),
            string.IsNullOrWhiteSpace(yieldText) ? null : yieldText.Trim(),
            string.IsNullOrWhiteSpace(tags) ? null : tags.Trim(),
            string.IsNullOrWhiteSpace(notes) ? null : notes.Trim(),
            ingredientRequests,
            stepRequests);
    }

    private static List<CreateMealPlanRecipeRequest> NormalizeMealRecipeRequests(CreateMealPlanSlotRequest request)
    {
        if (request.Recipes is { Count: > 0 })
        {
            return request.Recipes
                .Where(item => item.RecipeId != Guid.Empty)
                .ToList();
        }

        return request.RecipeId is null || request.RecipeId == Guid.Empty
            ? []
            : [new CreateMealPlanRecipeRequest(request.RecipeId.Value, MealRecipeRoles.Main)];
    }

    private async Task<List<CookingStartRecipe>> ResolveCookingStartRecipesAsync(
        Guid householdId,
        StartCookingSessionRequest request,
        CancellationToken cancellationToken)
    {
        if (request.MealPlanSlotId is not null)
        {
            var slot = await dbContext.MealPlanSlots
                .FirstOrDefaultAsync(item => item.HouseholdId == householdId && item.Id == request.MealPlanSlotId.Value, cancellationToken)
                ?? throw new InvalidOperationException("Meal plan slot could not be found.");
            var mealPlanRecipes = await dbContext.MealPlanRecipes
                .Where(item => item.MealPlanSlotId == slot.Id)
                .OrderBy(item => item.Position)
                .ToListAsync(cancellationToken);
            if (mealPlanRecipes.Count == 0 && slot.RecipeId is not null)
            {
                var legacyRecipe = await dbContext.Recipes
                    .FirstOrDefaultAsync(item => item.HouseholdId == householdId && item.Id == slot.RecipeId.Value, cancellationToken)
                    ?? throw new InvalidOperationException("This meal slot does not contain any recipes yet.");
                if (legacyRecipe.CurrentRevisionId is null)
                {
                    throw new InvalidOperationException("This meal slot does not contain any recipes yet.");
                }

                mealPlanRecipes =
                [
                    new MealPlanRecipe
                    {
                        Id = Guid.Empty,
                        MealPlanSlotId = slot.Id,
                        RecipeId = legacyRecipe.Id,
                        RecipeRevisionId = legacyRecipe.CurrentRevisionId.Value,
                        Role = MealRecipeRoles.Main,
                        Position = 1,
                        RecipeTitleSnapshot = legacyRecipe.Title,
                        CreatedAtUtc = slot.CreatedAtUtc
                    }
                ];
            }

            return mealPlanRecipes
                .Select(item => new CookingStartRecipe(
                    item.RecipeId,
                    item.RecipeRevisionId,
                    item.Role,
                    item.Position,
                    item.RecipeTitleSnapshot,
                    slot.Title))
                .ToList();
        }

        if (request.RecipeId is null || request.RecipeId == Guid.Empty)
        {
            return [];
        }

        var recipe = await dbContext.Recipes
            .FirstOrDefaultAsync(item => item.HouseholdId == householdId && item.Id == request.RecipeId.Value, cancellationToken)
            ?? throw new InvalidOperationException("Recipe could not be found.");
        if (recipe.CurrentRevisionId is null)
        {
            throw new InvalidOperationException("Recipe is missing a household-default revision.");
        }

        return [new CookingStartRecipe(recipe.Id, recipe.CurrentRevisionId.Value, MealRecipeRoles.Main, 1, recipe.Title, null)];
    }

    private static string NormalizeMealRole(string? role, int index)
    {
        if (string.IsNullOrWhiteSpace(role))
        {
            return index == 0 ? MealRecipeRoles.Main : MealRecipeRoles.Other;
        }

        return role.Trim().ToLowerInvariant() switch
        {
            "main" => MealRecipeRoles.Main,
            "side" => MealRecipeRoles.Side,
            "sauce" => MealRecipeRoles.Sauce,
            "dessert" => MealRecipeRoles.Dessert,
            "drink" => MealRecipeRoles.Drink,
            _ => MealRecipeRoles.Other
        };
    }

    private static RecipeChangeSuggestionResponse SummarizeRecipeChanges(IReadOnlyList<CookingSessionIngredient> ingredients)
    {
        var changedIngredients = ingredients
            .Where(item =>
                item.ActualQuantity != item.PlannedQuantity
                || !string.Equals(item.ActualUnit ?? item.PlannedUnit, item.PlannedUnit, StringComparison.OrdinalIgnoreCase))
            .Select(item => item.IngredientName)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        return new RecipeChangeSuggestionResponse(
            changedIngredients.Count > 0,
            changedIngredients.Count,
            changedIngredients);
    }

    private static List<CookingSessionTotalIngredientResponse> BuildTotalIngredientResponses(
        IReadOnlyList<CookingSessionIngredient> ingredients)
    {
        return ingredients
            .GroupBy(item => BuildIngredientGroupKey(item.NormalizedIngredientName, item.ActualUnit ?? item.PlannedUnit))
            .Select(group =>
            {
                var first = group.First();
                var allItems = group.ToList();
                var hasUnknownPlanned = allItems.Any(item => item.PlannedQuantity is null);
                var hasUnknownActual = allItems.Any(item => item.ActualQuantity is null && item.IsChecked);

                return new CookingSessionTotalIngredientResponse(
                    group.Key,
                    first.IngredientName,
                    hasUnknownPlanned ? null : allItems.Sum(item => item.PlannedQuantity ?? 0m),
                    CleanUnit(first.PlannedUnit),
                    hasUnknownActual ? null : allItems.Sum(item => item.ActualQuantity ?? item.PlannedQuantity ?? 0m),
                    CleanUnit(first.ActualUnit ?? first.PlannedUnit),
                    allItems.Sum(item => item.PantryDeductedQuantity ?? 0m),
                    allItems.Count(item => item.IsChecked || item.IsSkipped),
                    allItems.Count,
                    allItems.All(item => item.IsChecked || item.IsSkipped),
                    allItems.Select(item => item.Id).ToList());
            })
            .OrderBy(item => item.IngredientName)
            .ToList();
    }

    private static List<ShoppingDraft> BuildShoppingDrafts(
        MealPlanSlot slot,
        IReadOnlyList<MealPlanRecipe> mealPlanRecipes,
        IReadOnlyList<RecipeIngredient> ingredients)
    {
        var byRevision = ingredients
            .GroupBy(item => item.RecipeRevisionId)
            .ToDictionary(group => group.Key, group => group.OrderBy(item => item.Position).ToList());

        var rawDrafts = new List<ShoppingDraft>();
        foreach (var mealPlanRecipe in mealPlanRecipes.OrderBy(item => item.Position))
        {
            if (!byRevision.TryGetValue(mealPlanRecipe.RecipeRevisionId, out var recipeIngredients))
            {
                continue;
            }

            foreach (var ingredient in recipeIngredients)
            {
                var parse = IngredientNormalizer.ParseIngredient(ingredient.IngredientName);
                rawDrafts.Add(new ShoppingDraft(
                    ingredient.IngredientId,
                    ingredient.IngredientName,
                    ingredient.Quantity,
                    ingredient.Unit,
                    null,
                    mealPlanRecipe.RecipeTitleSnapshot,
                    slot.Title,
                    slot.Id,
                    parse.NormalizedName,
                    parse.CoreName,
                    parse.Preparation,
                    parse.Form));
            }
        }

        var combinable = rawDrafts
            .Where(item => item.Quantity is not null && !string.IsNullOrWhiteSpace(item.Unit))
            .GroupBy(item => BuildIngredientGroupKey(item.CoreIngredientName, item.UnitCanonical))
            .Select(group => new ShoppingDraft(
                group.First().IngredientId,
                group.First().IngredientName,
                group.Sum(item => item.Quantity ?? 0m),
                group.First().Unit,
                null,
                string.Join(", ", group.Select(item => item.RecipeTitle).Distinct(StringComparer.OrdinalIgnoreCase)),
                group.First().MealTitle,
                group.First().SourceMealPlanSlotId,
                group.First().NormalizedIngredientName,
                group.First().CoreIngredientName,
                string.Join(", ", group.Select(item => item.Preparation).Where(item => !string.IsNullOrWhiteSpace(item)).Distinct(StringComparer.OrdinalIgnoreCase)),
                group.First().Form))
            .ToList();

        var nonCombinable = rawDrafts
            .Where(item => item.Quantity is null || string.IsNullOrWhiteSpace(item.Unit))
            .ToList();

        return combinable
            .Concat(nonCombinable)
            .ToList();
    }

    private async Task<List<ShoppingListSummaryResponse>> BuildShoppingListSummariesAsync(
        Guid householdId,
        IReadOnlyCollection<string> statuses,
        int limit,
        CancellationToken cancellationToken)
    {
        var lists = await dbContext.ShoppingLists
            .Where(item => item.HouseholdId == householdId && statuses.Contains(item.Status))
            .OrderByDescending(item => item.CompletedAtUtc ?? item.CreatedAtUtc)
            .Take(limit)
            .ToListAsync(cancellationToken);

        var listIds = lists.Select(item => item.Id).ToList();
        var items = await dbContext.ShoppingListItems
            .Where(item => item.HouseholdId == householdId && listIds.Contains(item.ShoppingListId))
            .ToListAsync(cancellationToken);

        return lists
            .Select(list =>
            {
                var listItems = items.Where(item => item.ShoppingListId == list.Id).ToList();
                return new ShoppingListSummaryResponse(
                    list.Id,
                    list.Name,
                    list.Status,
                    list.CreatedAtUtc,
                    list.CompletedAtUtc,
                    listItems.Count(item => item.State == ShoppingListItemStates.Purchased),
                    listItems.Count,
                    string.Join(", ", listItems
                        .Select(item => item.SourceMealTitles)
                        .Where(item => !string.IsNullOrWhiteSpace(item))
                        .Distinct(StringComparer.OrdinalIgnoreCase)));
            })
            .ToList();
    }

    private async Task AutoArchiveCompletedShoppingListsAsync(
        Guid householdId,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        var cutoff = nowUtc.AddDays(-90);
        var completedLists = await dbContext.ShoppingLists
            .Where(item =>
                item.HouseholdId == householdId
                && item.Status == ShoppingListStatuses.Completed
                && item.CompletedAtUtc < cutoff)
            .ToListAsync(cancellationToken);

        if (completedLists.Count == 0)
        {
            return;
        }

        foreach (var list in completedLists)
        {
            list.Status = ShoppingListStatuses.Archived;
            list.ArchivedAtUtc = nowUtc;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<ShoppingListItem> UpsertShoppingItemAsync(
        Guid householdId,
        ShoppingDraft draft,
        bool pantryAware,
        bool forceSeparate,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        await EnsureDefaultFoodSetupAsync(householdId, cancellationToken);
        var shoppingList = await GetOrCreateDefaultShoppingListAsync(householdId, cancellationToken);

        var quantityNeeded = draft.Quantity;
        var state = string.IsNullOrWhiteSpace(draft.CoreIngredientName)
            ? ShoppingListItemStates.NeedsReview
            : ShoppingListItemStates.Needed;

        if (pantryAware)
        {
            var pantryItems = await dbContext.PantryItems
                .Where(item => item.HouseholdId == householdId && item.NormalizedIngredientName == draft.NormalizedIngredientName)
                .ToListAsync(cancellationToken);
            var compatiblePantryItems = pantryItems
                .Where(item => IngredientNormalizer.AreUnitsCompatible(item.Unit, draft.UnitCanonical))
                .ToList();

            if (draft.Quantity is null)
            {
                if (compatiblePantryItems.Count > 0)
                {
                    return compatiblePantryItems.Count > 0
                        ? await UpsertNeedsReviewPlaceholderAsync(householdId, shoppingList.Id, draft, nowUtc, cancellationToken)
                        : await UpsertNeedsReviewPlaceholderAsync(householdId, shoppingList.Id, draft, nowUtc, cancellationToken);
                }
            }
            else
            {
                var available = compatiblePantryItems.Sum(item => item.Quantity ?? 0m);
                quantityNeeded = Math.Max(draft.Quantity.Value - available, 0m);
                if (quantityNeeded <= 0m)
                {
                    return await UpsertNeedsReviewPlaceholderAsync(householdId, shoppingList.Id, draft with { Quantity = 0m }, nowUtc, cancellationToken);
                }
            }
        }

        if (!forceSeparate)
        {
            var existing = await dbContext.ShoppingListItems
                .Where(item =>
                    item.HouseholdId == householdId
                    && item.ShoppingListId == shoppingList.Id
                    && item.CoreIngredientName == draft.CoreIngredientName
                    && item.State != ShoppingListItemStates.Purchased
                    && item.State != ShoppingListItemStates.Skipped)
                .OrderBy(item => item.SortOrder)
                .ToListAsync(cancellationToken);

            var mergeTarget = existing.FirstOrDefault(item =>
                IngredientNormalizer.AreUnitsCompatible(item.UnitCanonical, draft.UnitCanonical));

            if (mergeTarget is not null)
            {
                if ((mergeTarget.QuantityNeeded is null) != (quantityNeeded is null)
                    || IngredientNormalizer.NeedsReviewForForms(mergeTarget.Notes, draft.Form))
                {
                    mergeTarget.State = ShoppingListItemStates.NeedsReview;
                }

                if (quantityNeeded is not null)
                {
                    mergeTarget.QuantityNeeded = (mergeTarget.QuantityNeeded ?? 0m) + quantityNeeded.Value;
                    mergeTarget.Quantity = mergeTarget.QuantityNeeded;
                }

                mergeTarget.Preparation = MergeCommaSeparated(mergeTarget.Preparation, draft.Preparation);
                mergeTarget.SourceRecipeTitle = MergeCommaSeparated(mergeTarget.SourceRecipeTitle, draft.RecipeTitle);
                mergeTarget.SourceMealTitle = MergeCommaSeparated(mergeTarget.SourceMealTitle, draft.MealTitle);
                mergeTarget.SourceMealTitles = MergeCommaSeparated(mergeTarget.SourceMealTitles, draft.MealTitle);
                mergeTarget.Notes = MergeNotes(mergeTarget.Notes, draft.Notes);
                mergeTarget.AisleCategory ??= ClassifyAisleCategory(draft.CoreIngredientName);
                mergeTarget.SourceMealPlanSlotId ??= draft.SourceMealPlanSlotId;
                return mergeTarget;
            }
        }

        var ingredient = await FindOrCreateIngredientAsync(householdId, draft.IngredientName, draft.Unit, nowUtc, cancellationToken);
        var nextSortOrder = await dbContext.ShoppingListItems
            .Where(item => item.ShoppingListId == shoppingList.Id)
            .Select(item => (int?)item.SortOrder)
            .MaxAsync(cancellationToken) ?? 0;

        var item = new ShoppingListItem
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            ShoppingListId = shoppingList.Id,
            IngredientId = ingredient.Id,
            IngredientName = draft.IngredientName,
            NormalizedIngredientName = draft.NormalizedIngredientName,
            CoreIngredientName = draft.CoreIngredientName,
            Preparation = draft.Preparation,
            Quantity = quantityNeeded,
            QuantityNeeded = quantityNeeded,
            Unit = draft.Unit,
            UnitCanonical = draft.UnitCanonical,
            Notes = draft.Notes,
            SourceRecipeTitle = draft.RecipeTitle,
            SourceMealTitle = draft.MealTitle,
            SourceMealTitles = draft.MealTitle,
            SourceMealPlanSlotId = draft.SourceMealPlanSlotId,
            State = state,
            SortOrder = nextSortOrder + 1,
            AisleCategory = ClassifyAisleCategory(draft.CoreIngredientName),
            CreatedAtUtc = nowUtc
        };

        if (quantityNeeded is null)
        {
            item.State = ShoppingListItemStates.NeedsReview;
        }

        dbContext.ShoppingListItems.Add(item);
        return item;
    }

    private async Task<ShoppingListItem> UpsertNeedsReviewPlaceholderAsync(
        Guid householdId,
        Guid shoppingListId,
        ShoppingDraft draft,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        var existing = await dbContext.ShoppingListItems
            .Where(item =>
                item.HouseholdId == householdId
                && item.ShoppingListId == shoppingListId
                && item.CoreIngredientName == draft.CoreIngredientName
                && item.State == ShoppingListItemStates.NeedsReview)
            .OrderBy(item => item.SortOrder)
            .FirstOrDefaultAsync(cancellationToken);

        if (existing is not null)
        {
            return existing;
        }

        var ingredient = await FindOrCreateIngredientAsync(householdId, draft.IngredientName, draft.Unit, nowUtc, cancellationToken);
        var item = new ShoppingListItem
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            ShoppingListId = shoppingListId,
            IngredientId = ingredient.Id,
            IngredientName = draft.IngredientName,
            NormalizedIngredientName = draft.NormalizedIngredientName,
            CoreIngredientName = draft.CoreIngredientName,
            Preparation = draft.Preparation,
            Quantity = draft.Quantity,
            QuantityNeeded = draft.Quantity,
            Unit = draft.Unit,
            UnitCanonical = draft.UnitCanonical,
            Notes = MergeNotes(draft.Notes, "Pantry match needs review."),
            SourceRecipeTitle = draft.RecipeTitle,
            SourceMealTitle = draft.MealTitle,
            SourceMealTitles = draft.MealTitle,
            SourceMealPlanSlotId = draft.SourceMealPlanSlotId,
            State = ShoppingListItemStates.NeedsReview,
            SortOrder = 0,
            AisleCategory = ClassifyAisleCategory(draft.CoreIngredientName),
            CreatedAtUtc = nowUtc
        };

        dbContext.ShoppingListItems.Add(item);
        return item;
    }

    private async Task TransferItemToPantryAsync(
        Guid householdId,
        ShoppingListItem item,
        Guid? pantryLocationOverrideId,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        await EnsureDefaultFoodSetupAsync(householdId, cancellationToken);
        var targetPantryLocationId = pantryLocationOverrideId ?? item.PantryLocationId;
        var pantryLocation = targetPantryLocationId is not null
            ? await dbContext.PantryLocations
                .FirstOrDefaultAsync(location => location.HouseholdId == householdId && location.Id == targetPantryLocationId.Value, cancellationToken)
            : await dbContext.PantryLocations
                .Where(location => location.HouseholdId == householdId)
                .OrderBy(location => location.SortOrder)
                .FirstAsync(cancellationToken);

        var ingredient = await FindOrCreateIngredientAsync(
            householdId,
            item.IngredientName,
            item.UnitCanonical ?? item.Unit,
            nowUtc,
            cancellationToken);

        var pantryItemCandidates = await dbContext.PantryItems
            .Where(existing =>
                existing.HouseholdId == householdId
                && existing.NormalizedIngredientName == item.NormalizedIngredientName
                && existing.PantryLocationId == pantryLocation!.Id)
            .ToListAsync(cancellationToken);
        var pantryItem = pantryItemCandidates.FirstOrDefault(existing => UnitsCompatible(existing.Unit, item.UnitCanonical ?? item.Unit));
        var transferQuantity = item.QuantityPurchased ?? item.QuantityNeeded;
        var transferUnit = item.UnitCanonical ?? item.Unit;

        if (pantryItem is null)
        {
            pantryItem = new PantryItem
            {
                Id = Guid.NewGuid(),
                HouseholdId = householdId,
                IngredientId = ingredient.Id,
                PantryLocationId = pantryLocation!.Id,
                IngredientName = item.IngredientName,
                NormalizedIngredientName = item.NormalizedIngredientName,
                Quantity = transferQuantity,
                Unit = transferUnit,
                UpdatedAtUtc = nowUtc,
                Status = ComputePantryStatus(transferQuantity, null)
            };

            dbContext.PantryItems.Add(pantryItem);
        }
        else if (transferQuantity is not null)
        {
            pantryItem.Quantity = (pantryItem.Quantity ?? 0m) + transferQuantity.Value;
            pantryItem.Unit = transferUnit ?? pantryItem.Unit;
            pantryItem.UpdatedAtUtc = nowUtc;
            pantryItem.Status = ComputePantryStatus(pantryItem.Quantity, pantryItem.LowThreshold);
        }

        RecordPantryItemActivity(
            householdId,
            pantryItem,
            PantryItemActivityKinds.ShoppingPurchase,
            transferQuantity,
            pantryItem.Quantity,
            pantryItem.Unit,
            item.Notes,
            item.IngredientName,
            nowUtc);
    }

    private static void ApplyShoppingItemState(ShoppingListItem item, string state, DateTimeOffset nowUtc)
    {
        item.State = state;
        item.IsCompleted = state is ShoppingListItemStates.Purchased or ShoppingListItemStates.Skipped;
        item.CompletedAtUtc = item.IsCompleted ? nowUtc : null;

        if (item.IsCompleted && item.QuantityPurchased is null)
        {
            item.QuantityPurchased = item.QuantityNeeded;
        }

        if (!item.IsCompleted)
        {
            item.QuantityPurchased = null;
        }
    }

    private async Task RefreshShoppingListCountsAsync(ShoppingList list, CancellationToken cancellationToken)
    {
        list.ItemsPurchasedCount = await dbContext.ShoppingListItems
            .Where(item => item.ShoppingListId == list.Id && item.State == ShoppingListItemStates.Purchased)
            .CountAsync(cancellationToken);
    }

    private async Task CompleteShoppingListInternalAsync(
        Guid householdId,
        ShoppingList list,
        Guid? userId,
        bool movePurchasedToPantry,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        var items = await dbContext.ShoppingListItems
            .Where(item => item.HouseholdId == householdId && item.ShoppingListId == list.Id)
            .ToListAsync(cancellationToken);

        if (movePurchasedToPantry)
        {
            foreach (var item in items.Where(item => item.State == ShoppingListItemStates.Purchased))
            {
                await TransferItemToPantryAsync(householdId, item, null, nowUtc, cancellationToken);
            }
        }

        list.Status = items.Count == 0 ? ShoppingListStatuses.Archived : ShoppingListStatuses.Completed;
        list.CompletedAtUtc = nowUtc;
        list.ArchivedAtUtc = list.Status == ShoppingListStatuses.Archived ? nowUtc : null;
        list.CompletedByUserId = userId;
        list.ItemsPurchasedCount = items.Count(item => item.State == ShoppingListItemStates.Purchased);

        await dbContext.SaveChangesAsync(cancellationToken);

        if (list.Status == ShoppingListStatuses.Completed)
        {
            dbContext.ShoppingLists.Add(new ShoppingList
            {
                Id = Guid.NewGuid(),
                HouseholdId = householdId,
                Name = list.Name,
                StoreName = list.StoreName,
                IsDefault = list.IsDefault,
                Status = ShoppingListStatuses.Active,
                CreatedAtUtc = nowUtc
            });

            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    private static string? MergeCommaSeparated(string? left, string? right)
    {
        var values = (left ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Concat((right ?? string.Empty).Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        return values.Count == 0 ? null : string.Join(", ", values);
    }

    private static string? MergeNotes(string? left, string? right)
    {
        if (string.IsNullOrWhiteSpace(left))
        {
            return string.IsNullOrWhiteSpace(right) ? null : right;
        }

        if (string.IsNullOrWhiteSpace(right))
        {
            return left;
        }

        return string.Equals(left, right, StringComparison.OrdinalIgnoreCase) ? left : $"{left} {right}";
    }

    private static string ClassifyAisleCategory(string coreIngredientName)
    {
        if (coreIngredientName.Contains("milk", StringComparison.OrdinalIgnoreCase)
            || coreIngredientName.Contains("cheese", StringComparison.OrdinalIgnoreCase)
            || coreIngredientName.Contains("yogurt", StringComparison.OrdinalIgnoreCase))
        {
            return "dairy";
        }

        if (coreIngredientName.Contains("chicken", StringComparison.OrdinalIgnoreCase)
            || coreIngredientName.Contains("beef", StringComparison.OrdinalIgnoreCase)
            || coreIngredientName.Contains("pork", StringComparison.OrdinalIgnoreCase))
        {
            return "meat";
        }

        if (coreIngredientName.Contains("ice cream", StringComparison.OrdinalIgnoreCase)
            || coreIngredientName.Contains("frozen", StringComparison.OrdinalIgnoreCase))
        {
            return "frozen";
        }

        if (coreIngredientName.Contains("onion", StringComparison.OrdinalIgnoreCase)
            || coreIngredientName.Contains("cilantro", StringComparison.OrdinalIgnoreCase)
            || coreIngredientName.Contains("ginger", StringComparison.OrdinalIgnoreCase)
            || coreIngredientName.Contains("pepper", StringComparison.OrdinalIgnoreCase))
        {
            return "produce";
        }

        return "pantry";
    }

    private void RecordPantryItemActivity(
        Guid householdId,
        PantryItem pantryItem,
        string kind,
        decimal? quantityDelta,
        decimal? quantityAfter,
        string? unit,
        string? note,
        string? sourceLabel,
        DateTimeOffset occurredAtUtc)
    {
        dbContext.PantryItemActivities.Add(new PantryItemActivity
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            PantryItemId = pantryItem.Id,
            Kind = kind,
            QuantityDelta = quantityDelta,
            QuantityAfter = quantityAfter,
            Unit = unit,
            Note = note,
            SourceLabel = sourceLabel,
            OccurredAtUtc = occurredAtUtc
        });
    }

    private static string BuildMealTitle(IReadOnlyList<string> recipeTitles)
    {
        if (recipeTitles.Count == 0)
        {
            return "Meal";
        }

        if (recipeTitles.Count == 1)
        {
            return recipeTitles[0];
        }

        if (recipeTitles.Count == 2)
        {
            return $"{recipeTitles[0]} + {recipeTitles[1]}";
        }

        return $"{recipeTitles[0]} + {recipeTitles.Count - 1} more";
    }

    private static string BuildIngredientGroupKey(string normalizedIngredientName, string? unit) =>
        $"{normalizedIngredientName}|{IngredientNormalizer.CanonicalUnit(unit) ?? "~"}";

    private static string NormalizeName(string value) => IngredientNormalizer.NormalizeName(value);

    private static string? CleanUnit(string? unit) => IngredientNormalizer.CanonicalUnit(unit);

    private static bool UnitsCompatible(string? left, string? right) => IngredientNormalizer.AreUnitsCompatible(left, right);

    private static string ComputePantryStatus(decimal? quantity, decimal? lowThreshold)
    {
        if (quantity is null)
        {
            return "InStock";
        }

        if (quantity <= 0)
        {
            return "Out";
        }

        if (lowThreshold is not null && quantity <= lowThreshold)
        {
            return "Low";
        }

        return "InStock";
    }

    private sealed record RecipeContent(
        string Title,
        string? Summary,
        string? YieldText,
        string? Tags,
        string? Notes,
        IReadOnlyList<RecipeEditableIngredientRequest> Ingredients,
        IReadOnlyList<RecipeEditableStepRequest> Steps);

    private sealed record CookingStartRecipe(
        Guid RecipeId,
        Guid RecipeRevisionId,
        string Role,
        int Position,
        string Title,
        string? MealTitle);

    private sealed record ShoppingDraft(
        Guid? IngredientId,
        string IngredientName,
        decimal? Quantity,
        string? Unit,
        string? Notes,
        string RecipeTitle,
        string? MealTitle,
        Guid? SourceMealPlanSlotId,
        string NormalizedIngredientName,
        string CoreIngredientName,
        string? Preparation,
        string? Form)
    {
        public string? UnitCanonical => IngredientNormalizer.CanonicalUnit(Unit);
    }
}
