using System.Globalization;
using System.Net;
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

        var recipes = await dbContext.Recipes
            .Where(recipe => recipe.HouseholdId == householdId)
            .OrderByDescending(recipe => recipe.UpdatedAtUtc)
            .Take(10)
            .ToListAsync(cancellationToken);

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

        var upcomingMeals = await dbContext.MealPlanSlots
            .Where(slot => slot.HouseholdId == householdId && slot.Date >= DateOnly.FromDateTime(DateTime.UtcNow.Date))
            .OrderBy(slot => slot.Date)
            .ThenBy(slot => slot.SlotName)
            .Take(8)
            .ToListAsync(cancellationToken);

        var defaultShoppingList = await GetOrCreateDefaultShoppingListAsync(householdId, cancellationToken);
        var shoppingItems = await dbContext.ShoppingListItems
            .Where(item => item.HouseholdId == householdId && item.ShoppingListId == defaultShoppingList.Id)
            .OrderBy(item => item.IsCompleted)
            .ThenBy(item => item.IngredientName)
            .Take(24)
            .ToListAsync(cancellationToken);

        var activeSessions = await dbContext.CookingSessions
            .Where(session => session.HouseholdId == householdId && session.Status == CookingSessionStatuses.Active)
            .OrderByDescending(session => session.UpdatedAtUtc)
            .ToListAsync(cancellationToken);

        var activeSessionIds = activeSessions.Select(session => session.Id).ToList();
        var sessionIngredientStats = await dbContext.CookingSessionIngredients
            .Where(ingredient => activeSessionIds.Contains(ingredient.CookingSessionId))
            .GroupBy(ingredient => ingredient.CookingSessionId)
            .Select(group => new
            {
                group.Key,
                CheckedCount = group.Count(ingredient => ingredient.IsChecked),
                TotalCount = group.Count()
            })
            .ToDictionaryAsync(
                group => group.Key,
                group => (group.CheckedCount, group.TotalCount),
                cancellationToken);

        var sessionStepCounts = await dbContext.CookingSessionSteps
            .Where(step => activeSessionIds.Contains(step.CookingSessionId))
            .GroupBy(step => step.CookingSessionId)
            .Select(group => new { group.Key, Count = group.Count() })
            .ToDictionaryAsync(group => group.Key, group => group.Count, cancellationToken);

        var pantryResponses = pantryItems
            .Select(item => ToPantryItemResponse(item.Item, item.LocationName))
            .ToList();

        var recipeResponses = recipes
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

        var mealResponses = upcomingMeals
            .Select(slot => new MealPlanSlotResponse(
                slot.Id,
                slot.Date,
                slot.SlotName,
                slot.RecipeId,
                slot.RecipeTitleSnapshot,
                slot.Notes))
            .ToList();

        var shoppingResponse = new ShoppingListResponse(
            defaultShoppingList.Id,
            defaultShoppingList.Name,
            defaultShoppingList.StoreName,
            shoppingItems.Select(ToShoppingListItemResponse).ToList());

        var activeSessionResponses = activeSessions
            .Select(session =>
            {
                sessionIngredientStats.TryGetValue(session.Id, out var ingredientStats);
                sessionStepCounts.TryGetValue(session.Id, out var stepCount);
                return new CookingSessionSummaryResponse(
                    session.Id,
                    session.RecipeId,
                    session.Title,
                    session.Status,
                    session.PantryUpdateMode,
                    session.CurrentStepIndex,
                    stepCount,
                    ingredientStats.CheckedCount,
                    ingredientStats.TotalCount,
                    session.StartedAtUtc);
            })
            .ToList();

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
                shoppingResponse.Items.Count(item => !item.IsCompleted),
                activeSessionResponses.Count),
            tonightCookView,
            recipeResponses,
            pantryResponses,
            pantryLocations,
            mealResponses,
            shoppingResponse,
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
        var failureReason = default(string);

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

    public async Task<RecipeDetailResponse> SaveImportedRecipeAsync(
        Guid householdId,
        Guid userId,
        SaveImportedRecipeRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        var importJob = await dbContext.RecipeImportJobs
            .FirstOrDefaultAsync(job => job.HouseholdId == householdId && job.Id == request.ImportJobId, cancellationToken)
            ?? throw new InvalidOperationException("Recipe import review could not be found.");

        var title = request.Title?.Trim();
        if (string.IsNullOrWhiteSpace(title))
        {
            throw new InvalidOperationException("Recipe title is required.");
        }

        var ingredientRequests = request.Ingredients?
            .Where(item => !string.IsNullOrWhiteSpace(item.IngredientName))
            .ToList() ?? [];
        var stepRequests = request.Steps?
            .Where(step => !string.IsNullOrWhiteSpace(step.Instruction))
            .OrderBy(step => step.Position)
            .ToList() ?? [];

        var source = new RecipeSource
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            Kind = RecipeSourceKinds.UrlImport,
            SourceUrl = importJob.SourceUrl,
            SourceTitle = importJob.ImportedTitle ?? title,
            SourceSiteName = importJob.SourceSiteName,
            Attribution = importJob.SourceSiteName,
            CreatedAtUtc = nowUtc
        };

        var recipe = new Recipe
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            SourceId = source.Id,
            Title = title,
            Summary = request.Summary?.Trim(),
            Tags = request.Tags?.Trim(),
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
            Title = title,
            Summary = request.Summary?.Trim(),
            YieldText = request.YieldText?.Trim(),
            Notes = request.Notes?.Trim(),
            Tags = request.Tags?.Trim(),
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
            Title = title,
            Summary = request.Summary?.Trim(),
            YieldText = request.YieldText?.Trim(),
            Notes = request.Notes?.Trim(),
            Tags = request.Tags?.Trim(),
            CreatedAtUtc = nowUtc
        };

        recipe.ImportedSourceRevisionId = importedRevision.Id;
        recipe.CurrentRevisionId = householdRevision.Id;

        dbContext.RecipeSources.Add(source);
        dbContext.Recipes.Add(recipe);
        dbContext.RecipeRevisions.AddRange(importedRevision, householdRevision);

        await CreateRecipeRevisionContentAsync(importedRevision.Id, householdId, ingredientRequests, stepRequests, cancellationToken);
        await CreateRecipeRevisionContentAsync(householdRevision.Id, householdId, ingredientRequests, stepRequests, cancellationToken);

        importJob.Status = RecipeImportJobStatuses.Consumed;
        importJob.ConsumedAtUtc = nowUtc;

        await dbContext.SaveChangesAsync(cancellationToken);

        return await BuildRecipeDetailAsync(recipe, cancellationToken);
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
        await dbContext.SaveChangesAsync(cancellationToken);

        return ToPantryItemResponse(pantryItem, location.Name);
    }

    public async Task<MealPlanSlotResponse?> CreateMealPlanSlotAsync(
        Guid householdId,
        CreateMealPlanSlotRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        var recipe = await dbContext.Recipes
            .FirstOrDefaultAsync(item => item.HouseholdId == householdId && item.Id == request.RecipeId, cancellationToken);
        if (recipe is null)
        {
            return null;
        }

        var slot = new MealPlanSlot
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            RecipeId = recipe.Id,
            Date = request.Date,
            SlotName = string.IsNullOrWhiteSpace(request.SlotName) ? "Dinner" : request.SlotName.Trim(),
            RecipeTitleSnapshot = recipe.Title,
            Notes = request.Notes?.Trim(),
            CreatedAtUtc = nowUtc
        };

        dbContext.MealPlanSlots.Add(slot);
        await dbContext.SaveChangesAsync(cancellationToken);

        if (request.GenerateShoppingList)
        {
            await AddMissingIngredientsToDefaultShoppingListAsync(
                householdId,
                recipe,
                nowUtc,
                cancellationToken);
        }

        return new MealPlanSlotResponse(slot.Id, slot.Date, slot.SlotName, slot.RecipeId, slot.RecipeTitleSnapshot, slot.Notes);
    }

    public async Task<ShoppingListItemResponse> CreateShoppingListItemAsync(
        Guid householdId,
        CreateShoppingListItemRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        await EnsureDefaultFoodSetupAsync(householdId, cancellationToken);
        var shoppingList = await GetOrCreateDefaultShoppingListAsync(householdId, cancellationToken);

        var ingredientName = request.IngredientName?.Trim();
        if (string.IsNullOrWhiteSpace(ingredientName))
        {
            throw new InvalidOperationException("Shopping item name is required.");
        }

        var ingredient = await FindOrCreateIngredientAsync(householdId, ingredientName, request.Unit, nowUtc, cancellationToken);
        var item = new ShoppingListItem
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            ShoppingListId = shoppingList.Id,
            IngredientId = ingredient.Id,
            IngredientName = ingredientName,
            NormalizedIngredientName = NormalizeName(ingredientName),
            Quantity = request.Quantity,
            Unit = CleanUnit(request.Unit),
            Notes = request.Notes?.Trim(),
            CreatedAtUtc = nowUtc
        };

        dbContext.ShoppingListItems.Add(item);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ToShoppingListItemResponse(item);
    }

    public async Task<ShoppingListItemResponse?> ToggleShoppingListItemAsync(
        Guid householdId,
        Guid itemId,
        ToggleShoppingListItemRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        var item = await dbContext.ShoppingListItems
            .FirstOrDefaultAsync(listItem => listItem.HouseholdId == householdId && listItem.Id == itemId, cancellationToken);
        if (item is null)
        {
            return null;
        }

        item.IsCompleted = request.IsCompleted;
        item.CompletedAtUtc = request.IsCompleted ? nowUtc : null;

        if (request.IsCompleted && request.MoveToPantry)
        {
            await EnsureDefaultFoodSetupAsync(householdId, cancellationToken);
            var pantryLocation = await dbContext.PantryLocations
                .Where(location => location.HouseholdId == householdId)
                .OrderBy(location => location.SortOrder)
                .FirstAsync(cancellationToken);
            var ingredient = await FindOrCreateIngredientAsync(
                householdId,
                item.IngredientName,
                item.Unit,
                nowUtc,
                cancellationToken);

            var pantryItem = await dbContext.PantryItems
                .FirstOrDefaultAsync(existing =>
                    existing.HouseholdId == householdId
                    && existing.NormalizedIngredientName == item.NormalizedIngredientName
                    && existing.Unit == item.Unit
                    && existing.PantryLocationId == pantryLocation.Id,
                    cancellationToken);

            if (pantryItem is null)
            {
                pantryItem = new PantryItem
                {
                    Id = Guid.NewGuid(),
                    HouseholdId = householdId,
                    IngredientId = ingredient.Id,
                    PantryLocationId = pantryLocation.Id,
                    IngredientName = item.IngredientName,
                    NormalizedIngredientName = item.NormalizedIngredientName,
                    Quantity = item.Quantity,
                    Unit = item.Unit,
                    UpdatedAtUtc = nowUtc,
                    Status = ComputePantryStatus(item.Quantity, null)
                };

                dbContext.PantryItems.Add(pantryItem);
            }
            else if (item.Quantity is not null && pantryItem.Quantity is not null)
            {
                pantryItem.Quantity += item.Quantity;
                pantryItem.UpdatedAtUtc = nowUtc;
                pantryItem.Status = ComputePantryStatus(pantryItem.Quantity, pantryItem.LowThreshold);
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return ToShoppingListItemResponse(item);
    }

    public async Task<CookingSessionResponse> StartCookingSessionAsync(
        Guid householdId,
        Guid? userId,
        StartCookingSessionRequest request,
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

        var revision = await dbContext.RecipeRevisions
            .FirstAsync(item => item.Id == recipe.CurrentRevisionId.Value, cancellationToken);
        var ingredients = await dbContext.RecipeIngredients
            .Where(item => item.RecipeRevisionId == revision.Id)
            .OrderBy(item => item.Position)
            .ToListAsync(cancellationToken);
        var steps = await dbContext.RecipeSteps
            .Where(item => item.RecipeRevisionId == revision.Id)
            .OrderBy(item => item.Position)
            .ToListAsync(cancellationToken);

        var session = new CookingSession
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            RecipeId = recipe.Id,
            RecipeRevisionId = revision.Id,
            StartedByUserId = userId,
            Title = recipe.Title,
            PantryUpdateMode = string.Equals(request.PantryUpdateMode, PantryUpdateModes.ConfirmOnComplete, StringComparison.Ordinal)
                ? PantryUpdateModes.ConfirmOnComplete
                : PantryUpdateModes.Progressive,
            StartedAtUtc = nowUtc,
            UpdatedAtUtc = nowUtc
        };

        dbContext.CookingSessions.Add(session);

        foreach (var ingredient in ingredients)
        {
            dbContext.CookingSessionIngredients.Add(new CookingSessionIngredient
            {
                Id = Guid.NewGuid(),
                CookingSessionId = session.Id,
                RecipeIngredientId = ingredient.Id,
                Position = ingredient.Position,
                IngredientName = ingredient.IngredientName,
                NormalizedIngredientName = ingredient.NormalizedIngredientName,
                PlannedQuantity = ingredient.Quantity,
                PlannedUnit = ingredient.Unit,
                PantryDeductionStatus = session.PantryUpdateMode == PantryUpdateModes.ConfirmOnComplete
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
                RecipeStepId = step.Id,
                Position = step.Position,
                Instruction = step.Instruction
            });
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

        var changedIngredients = ingredients
            .Where(item =>
                item.ActualQuantity != item.PlannedQuantity
                || !string.Equals(item.ActualUnit ?? item.PlannedUnit, item.PlannedUnit, StringComparison.OrdinalIgnoreCase))
            .Select(item => item.IngredientName)
            .Distinct()
            .ToList();

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

        var currentStep = steps.FirstOrDefault(step => step.Position == session.CurrentStepIndex + 1)
            ?? steps.FirstOrDefault(step => !step.IsCompleted)
            ?? steps.FirstOrDefault();
        var nextStep = currentStep is null
            ? null
            : steps.FirstOrDefault(step => step.Position == currentStep.Position + 1);

        return new CookingSessionResponse(
            session.Id,
            session.RecipeId,
            session.RecipeRevisionId,
            session.MealPlanSlotId,
            session.Title,
            session.Status,
            session.PantryUpdateMode,
            session.CurrentStepIndex,
            currentStep?.Instruction,
            nextStep?.Instruction,
            new RecipeChangeSuggestionResponse(
                changedIngredients.Count > 0,
                changedIngredients.Count,
                changedIngredients),
            pantryImpact,
            ingredients.Select(item => new CookingSessionIngredientResponse(
                item.Id,
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
            steps.Select(item => new CookingSessionStepResponse(
                item.Id,
                item.Position,
                item.Instruction,
                item.Notes,
                item.IsCompleted))
            .ToList());
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
        ingredient.ActualQuantity = request.ActualQuantity ?? ingredient.ActualQuantity;
        ingredient.ActualUnit = request.ActualUnit?.Trim() ?? ingredient.ActualUnit;
        ingredient.Notes = request.Notes?.Trim() ?? ingredient.Notes;
        session.UpdatedAtUtc = nowUtc;

        if (session.PantryUpdateMode == PantryUpdateModes.Progressive)
        {
            await RebuildPantryAdjustmentsAsync(ingredient, nowUtc, cancellationToken);
        }
        else
        {
            await ReverseExistingAdjustmentsAsync(ingredient, cancellationToken);
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

        if (request.IsCompleted is not null)
        {
            step.IsCompleted = request.IsCompleted.Value;
        }

        if (!string.IsNullOrWhiteSpace(request.Notes))
        {
            step.Notes = request.Notes.Trim();
        }

        if (request.MakeCurrent == true)
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

        var recipe = await dbContext.Recipes
            .FirstOrDefaultAsync(item => item.HouseholdId == householdId && item.Id == session.RecipeId, cancellationToken);
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
            .Where(item => item.CookingSessionId == sessionId)
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

        return new TvCookingDisplayResponse(
            session.Id,
            session.Title,
            session.CurrentStepIndex,
            session.Steps.Count,
            session.CurrentStepInstruction,
            session.NextStepInstruction,
            session.Ingredients
                .Where(item => !item.IsChecked && !item.IsSkipped)
                .Select(FormatIngredientLine)
                .ToList(),
            session.Ingredients
                .Where(item => item.IsChecked && !item.IsSkipped)
                .Select(FormatIngredientLine)
                .ToList(),
            session.Steps
                .Where(step => step.Position > session.CurrentStepIndex)
                .Select(step => step.Instruction)
                .ToList());
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
        var ingredients = await dbContext.RecipeIngredients
            .AsNoTracking()
            .Where(item => revisions.Select(revision => revision.Id).Contains(item.RecipeRevisionId))
            .OrderBy(item => item.Position)
            .ToListAsync(cancellationToken);
        var steps = await dbContext.RecipeSteps
            .AsNoTracking()
            .Where(item => revisions.Select(revision => revision.Id).Contains(item.RecipeRevisionId))
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

    private RecipeRevisionResponse ToRecipeRevisionResponse(
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
                DateTimeOffset.UtcNow,
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

    private async Task AddMissingIngredientsToDefaultShoppingListAsync(
        Guid householdId,
        Recipe recipe,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        if (recipe.CurrentRevisionId is null)
        {
            return;
        }

        await EnsureDefaultFoodSetupAsync(householdId, cancellationToken);
        var defaultShoppingList = await GetOrCreateDefaultShoppingListAsync(householdId, cancellationToken);
        var revisionIngredients = await dbContext.RecipeIngredients
            .Where(item => item.RecipeRevisionId == recipe.CurrentRevisionId.Value)
            .OrderBy(item => item.Position)
            .ToListAsync(cancellationToken);
        var pantryItems = await dbContext.PantryItems
            .Where(item => item.HouseholdId == householdId)
            .ToListAsync(cancellationToken);

        foreach (var ingredient in revisionIngredients)
        {
            var pantryMatches = pantryItems
                .Where(item =>
                    item.NormalizedIngredientName == ingredient.NormalizedIngredientName
                    && UnitsCompatible(item.Unit, ingredient.Unit))
                .ToList();

            var available = pantryMatches.Sum(item => item.Quantity ?? 0m);
            decimal? missingQuantity = null;
            if (ingredient.Quantity is not null)
            {
                missingQuantity = Math.Max(ingredient.Quantity.Value - available, 0m);
                if (missingQuantity == 0)
                {
                    continue;
                }
            }

            var existingItem = await dbContext.ShoppingListItems
                .FirstOrDefaultAsync(item =>
                    item.HouseholdId == householdId
                    && item.ShoppingListId == defaultShoppingList.Id
                    && !item.IsCompleted
                    && item.NormalizedIngredientName == ingredient.NormalizedIngredientName
                    && item.Unit == ingredient.Unit,
                    cancellationToken);

            if (existingItem is not null)
            {
                if (missingQuantity is not null)
                {
                    existingItem.Quantity = (existingItem.Quantity ?? 0m) + missingQuantity.Value;
                }

                continue;
            }

            dbContext.ShoppingListItems.Add(new ShoppingListItem
            {
                Id = Guid.NewGuid(),
                HouseholdId = householdId,
                ShoppingListId = defaultShoppingList.Id,
                IngredientId = ingredient.IngredientId,
                IngredientName = ingredient.IngredientName,
                NormalizedIngredientName = ingredient.NormalizedIngredientName,
                Quantity = missingQuantity,
                Unit = ingredient.Unit,
                SourceRecipeTitle = recipe.Title,
                CreatedAtUtc = nowUtc,
                Notes = missingQuantity is null ? "Pantry match needs review." : null
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<TonightCookViewResponse?> BuildTonightCookViewAsync(
        Guid householdId,
        CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        var slot = await dbContext.MealPlanSlots
            .Where(item => item.HouseholdId == householdId && item.Date == today && item.RecipeId != null)
            .OrderBy(item => item.SlotName)
            .FirstOrDefaultAsync(cancellationToken);
        if (slot is null || slot.RecipeId is null)
        {
            return null;
        }

        var recipe = await dbContext.Recipes
            .FirstOrDefaultAsync(item => item.HouseholdId == householdId && item.Id == slot.RecipeId.Value, cancellationToken);
        if (recipe?.CurrentRevisionId is null)
        {
            return null;
        }

        var recipeIngredients = await dbContext.RecipeIngredients
            .Where(item => item.RecipeRevisionId == recipe.CurrentRevisionId.Value)
            .ToListAsync(cancellationToken);
        var pantryItems = await dbContext.PantryItems
            .Where(item => item.HouseholdId == householdId)
            .ToListAsync(cancellationToken);

        var missing = new List<string>();
        foreach (var ingredient in recipeIngredients)
        {
            var pantryMatches = pantryItems.Where(item =>
                item.NormalizedIngredientName == ingredient.NormalizedIngredientName
                && UnitsCompatible(item.Unit, ingredient.Unit));
            var available = pantryMatches.Sum(item => item.Quantity ?? 0m);
            if (ingredient.Quantity is null && !pantryMatches.Any())
            {
                missing.Add(ingredient.IngredientName);
                continue;
            }

            if (ingredient.Quantity is not null && available < ingredient.Quantity.Value)
            {
                missing.Add(ingredient.IngredientName);
            }
        }

        return new TonightCookViewResponse(
            slot.Id,
            recipe.Id,
            recipe.Title,
            missing.Count == 0
                ? "Planned for today and mostly covered by pantry."
                : "Planned for today with a few shopping gaps to close.",
            missing.Count,
            missing);
    }

    private async Task RebuildPantryAdjustmentsAsync(
        CookingSessionIngredient ingredient,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken)
    {
        await ReverseExistingAdjustmentsAsync(ingredient, cancellationToken);

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

        var matchingPantryItems = await dbContext.PantryItems
            .Where(item =>
                item.HouseholdId == session.HouseholdId
                && item.NormalizedIngredientName == ingredient.NormalizedIngredientName
                && UnitsCompatible(item.Unit, desiredUnit))
            .OrderBy(item => item.ExpiresAtUtc ?? DateTimeOffset.MaxValue)
            .ThenBy(item => item.UpdatedAtUtc)
            .ToListAsync(cancellationToken);

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
            pantryItem.UpdatedAtUtc = DateTimeOffset.UtcNow;
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
        var shoppingList = await dbContext.ShoppingLists
            .FirstOrDefaultAsync(item => item.HouseholdId == householdId && item.IsDefault, cancellationToken);
        if (shoppingList is not null)
        {
            return shoppingList;
        }

        shoppingList = new ShoppingList
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            Name = "Main grocery list",
            IsDefault = true,
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
        var normalizedName = NormalizeName(ingredientName);
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
            DefaultUnit = CleanUnit(unit),
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
            item.Quantity,
            item.Unit,
            item.Notes,
            item.SourceRecipeTitle,
            item.IsCompleted,
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

    private static string NormalizeName(string value) =>
        string.Join(
            ' ',
            value.Trim().ToLowerInvariant()
                .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));

    private static string? CleanUnit(string? unit) =>
        string.IsNullOrWhiteSpace(unit) ? null : unit.Trim().ToLowerInvariant();

    private static bool UnitsCompatible(string? left, string? right) =>
        string.Equals(CleanUnit(left), CleanUnit(right), StringComparison.OrdinalIgnoreCase)
        || string.IsNullOrWhiteSpace(left)
        || string.IsNullOrWhiteSpace(right);

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
}
