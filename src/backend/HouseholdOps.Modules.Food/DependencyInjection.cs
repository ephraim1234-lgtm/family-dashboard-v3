using HouseholdOps.Modules.Food.Contracts;
using HouseholdOps.Modules.Identity;
using HouseholdOps.SharedKernel.Time;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace HouseholdOps.Modules.Food;

public static class DependencyInjection
{
    public static IServiceCollection AddFoodModule(this IServiceCollection services) => services;

    public static IEndpointRouteBuilder MapFoodModule(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/food")
            .RequireAuthorization();

        group.MapGet("/dashboard", async (
            IIdentityAccessService identityAccessService,
            IFoodService foodService,
            CancellationToken cancellationToken) =>
        {
            if (!TryGetActiveHousehold(identityAccessService, out var householdId))
            {
                return Results.Forbid();
            }

            var response = await foodService.GetDashboardAsync(householdId, cancellationToken);
            return Results.Ok(response);
        });

        group.MapPost("/recipe-imports", async (
            CreateRecipeImportRequest? request,
            IIdentityAccessService identityAccessService,
            IFoodService foodService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            if (request is null)
            {
                return Results.BadRequest("A valid recipe URL is required.");
            }

            if (!TryGetActiveHouseholdAndUser(identityAccessService, out var householdId, out var userId))
            {
                return Results.Forbid();
            }

            var response = await foodService.CreateRecipeImportAsync(
                householdId,
                userId,
                request,
                clock.UtcNow,
                cancellationToken);

            return Results.Ok(response);
        });

        group.MapPost("/recipes", async (
            SaveRecipeRequest? request,
            IIdentityAccessService identityAccessService,
            IFoodService foodService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            if (request is null)
            {
                return Results.BadRequest("A valid recipe payload is required.");
            }

            if (!TryGetActiveHouseholdAndUser(identityAccessService, out var householdId, out var userId))
            {
                return Results.Forbid();
            }

            var response = await foodService.SaveRecipeAsync(
                householdId,
                userId,
                request,
                clock.UtcNow,
                cancellationToken);

            return Results.Ok(response);
        });

        group.MapGet("/recipes", async (
            string? query,
            IIdentityAccessService identityAccessService,
            IFoodService foodService,
            CancellationToken cancellationToken) =>
        {
            if (!TryGetActiveHousehold(identityAccessService, out var householdId))
            {
                return Results.Forbid();
            }

            var response = await foodService.ListRecipesAsync(householdId, query, cancellationToken);
            return Results.Ok(response);
        });

        group.MapGet("/recipes/{recipeId:guid}", async (
            Guid recipeId,
            IIdentityAccessService identityAccessService,
            IFoodService foodService,
            CancellationToken cancellationToken) =>
        {
            if (!TryGetActiveHousehold(identityAccessService, out var householdId))
            {
                return Results.Forbid();
            }

            var response = await foodService.GetRecipeAsync(householdId, recipeId, cancellationToken);
            return response is null ? Results.NotFound() : Results.Ok(response);
        });

        group.MapPatch("/recipes/{recipeId:guid}", async (
            Guid recipeId,
            UpdateRecipeRequest? request,
            IIdentityAccessService identityAccessService,
            IFoodService foodService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            if (request is null)
            {
                return Results.BadRequest("A valid recipe payload is required.");
            }

            if (!TryGetActiveHouseholdAndUser(identityAccessService, out var householdId, out var userId))
            {
                return Results.Forbid();
            }

            var response = await foodService.UpdateRecipeAsync(
                householdId,
                recipeId,
                userId,
                request,
                clock.UtcNow,
                cancellationToken);

            return response is null ? Results.NotFound() : Results.Ok(response);
        });

        group.MapDelete("/recipes/{recipeId:guid}", async (
            Guid recipeId,
            IIdentityAccessService identityAccessService,
            IFoodService foodService,
            CancellationToken cancellationToken) =>
        {
            if (!TryGetActiveHousehold(identityAccessService, out var householdId))
            {
                return Results.Forbid();
            }

            var deleted = await foodService.DeleteRecipeAsync(householdId, recipeId, cancellationToken);
            return deleted ? Results.NoContent() : Results.NotFound();
        });

        group.MapPost("/pantry-items", async (
            CreatePantryItemRequest? request,
            IIdentityAccessService identityAccessService,
            IFoodService foodService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            if (request is null)
            {
                return Results.BadRequest("A valid pantry item payload is required.");
            }

            if (!TryGetActiveHousehold(identityAccessService, out var householdId))
            {
                return Results.Forbid();
            }

            var response = await foodService.CreatePantryItemAsync(
                householdId,
                request,
                clock.UtcNow,
                cancellationToken);

            return Results.Ok(response);
        });

        group.MapPatch("/pantry-items/{pantryItemId:guid}", async (
            Guid pantryItemId,
            UpdatePantryItemRequest? request,
            IIdentityAccessService identityAccessService,
            IFoodService foodService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            if (request is null)
            {
                return Results.BadRequest("A valid pantry item payload is required.");
            }

            if (!TryGetActiveHousehold(identityAccessService, out var householdId))
            {
                return Results.Forbid();
            }

            var response = await foodService.UpdatePantryItemAsync(
                householdId,
                pantryItemId,
                request,
                clock.UtcNow,
                cancellationToken);

            return response is null ? Results.NotFound() : Results.Ok(response);
        });

        group.MapDelete("/pantry-items/{pantryItemId:guid}", async (
            Guid pantryItemId,
            IIdentityAccessService identityAccessService,
            IFoodService foodService,
            CancellationToken cancellationToken) =>
        {
            if (!TryGetActiveHousehold(identityAccessService, out var householdId))
            {
                return Results.Forbid();
            }

            var deleted = await foodService.DeletePantryItemAsync(householdId, pantryItemId, cancellationToken);
            return deleted ? Results.NoContent() : Results.NotFound();
        });

        group.MapGet("/pantry-items/{pantryItemId:guid}/history", async (
            Guid pantryItemId,
            IIdentityAccessService identityAccessService,
            IFoodService foodService,
            CancellationToken cancellationToken) =>
        {
            if (!TryGetActiveHousehold(identityAccessService, out var householdId))
            {
                return Results.Forbid();
            }

            var response = await foodService.GetPantryItemHistoryAsync(
                householdId,
                pantryItemId,
                cancellationToken);

            return Results.Ok(response);
        });

        group.MapPost("/meal-plan", async (
            CreateMealPlanSlotRequest? request,
            IIdentityAccessService identityAccessService,
            IFoodService foodService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            if (request is null)
            {
                return Results.BadRequest("A valid meal slot payload is required.");
            }

            if (!TryGetActiveHousehold(identityAccessService, out var householdId))
            {
                return Results.Forbid();
            }

            var response = await foodService.CreateMealPlanSlotAsync(
                householdId,
                request,
                clock.UtcNow,
                cancellationToken);

            return response is null ? Results.NotFound() : Results.Ok(response);
        });

        group.MapDelete("/meal-plan/{slotId:guid}", async (
            Guid slotId,
            IIdentityAccessService identityAccessService,
            IFoodService foodService,
            CancellationToken cancellationToken) =>
        {
            if (!TryGetActiveHousehold(identityAccessService, out var householdId))
            {
                return Results.Forbid();
            }

            var deleted = await foodService.DeleteMealPlanSlotAsync(householdId, slotId, cancellationToken);
            return deleted ? Results.NoContent() : Results.NotFound();
        });

        group.MapDelete("/meal-plan/{slotId:guid}/recipes/{recipeId:guid}", async (
            Guid slotId,
            Guid recipeId,
            IIdentityAccessService identityAccessService,
            IFoodService foodService,
            CancellationToken cancellationToken) =>
        {
            if (!TryGetActiveHousehold(identityAccessService, out var householdId))
            {
                return Results.Forbid();
            }

            var removed = await foodService.RemoveRecipeFromMealPlanSlotAsync(
                householdId,
                slotId,
                recipeId,
                cancellationToken);

            return removed ? Results.NoContent() : Results.NotFound();
        });

        group.MapGet("/shopping-lists", async (
            string? status,
            IIdentityAccessService identityAccessService,
            IFoodService foodService,
            CancellationToken cancellationToken) =>
        {
            if (!TryGetActiveHousehold(identityAccessService, out var householdId))
            {
                return Results.Forbid();
            }

            var response = await foodService.ListShoppingListsAsync(householdId, status, cancellationToken);
            return Results.Ok(response);
        });

        group.MapGet("/shopping-lists/{shoppingListId:guid}", async (
            Guid shoppingListId,
            IIdentityAccessService identityAccessService,
            IFoodService foodService,
            CancellationToken cancellationToken) =>
        {
            if (!TryGetActiveHousehold(identityAccessService, out var householdId))
            {
                return Results.Forbid();
            }

            var response = await foodService.GetShoppingListAsync(householdId, shoppingListId, cancellationToken);
            return response is null ? Results.NotFound() : Results.Ok(response);
        });

        group.MapPost("/shopping-list/items", async (
            CreateShoppingListItemRequest? request,
            IIdentityAccessService identityAccessService,
            IFoodService foodService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            if (request is null)
            {
                return Results.BadRequest("A valid shopping item payload is required.");
            }

            if (!TryGetActiveHousehold(identityAccessService, out var householdId))
            {
                return Results.Forbid();
            }

            var response = await foodService.CreateShoppingListItemAsync(
                householdId,
                request,
                clock.UtcNow,
                cancellationToken);

            return Results.Ok(response);
        });

        group.MapPost("/shopping-list/items/from-recipe", async (
            AddItemsFromRecipeRequest? request,
            IIdentityAccessService identityAccessService,
            IFoodService foodService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            if (request is null)
            {
                return Results.BadRequest("A valid recipe shopping payload is required.");
            }

            if (!TryGetActiveHousehold(identityAccessService, out var householdId))
            {
                return Results.Forbid();
            }

            var response = await foodService.AddItemsFromRecipeAsync(
                householdId,
                request,
                clock.UtcNow,
                cancellationToken);

            return Results.Ok(response);
        });

        group.MapPost("/shopping-list/items/from-meal", async (
            AddItemsFromMealPlanSlotRequest? request,
            IIdentityAccessService identityAccessService,
            IFoodService foodService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            if (request is null)
            {
                return Results.BadRequest("A valid meal shopping payload is required.");
            }

            if (!TryGetActiveHousehold(identityAccessService, out var householdId))
            {
                return Results.Forbid();
            }

            var response = await foodService.AddItemsFromMealPlanSlotAsync(
                householdId,
                request,
                clock.UtcNow,
                cancellationToken);

            return Results.Ok(response);
        });

        group.MapPost("/shopping-list/items/bulk-state", async (
            BulkUpdateShoppingItemsRequest? request,
            IIdentityAccessService identityAccessService,
            IFoodService foodService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            if (request is null)
            {
                return Results.BadRequest("A valid shopping bulk payload is required.");
            }

            if (!TryGetActiveHousehold(identityAccessService, out var householdId))
            {
                return Results.Forbid();
            }

            var response = await foodService.BulkUpdateShoppingItemsAsync(
                householdId,
                request,
                clock.UtcNow,
                cancellationToken);

            return Results.Ok(response);
        });

        group.MapPost("/shopping-list/items/merge-preview", async (
            MergePreviewItemRequest? request,
            IIdentityAccessService identityAccessService,
            IFoodService foodService,
            CancellationToken cancellationToken) =>
        {
            if (request is null)
            {
                return Results.BadRequest("A valid merge preview payload is required.");
            }

            if (!TryGetActiveHousehold(identityAccessService, out var householdId))
            {
                return Results.Forbid();
            }

            var response = await foodService.GetShoppingMergePreviewAsync(householdId, request, cancellationToken);
            return Results.Ok(response);
        });

        group.MapPatch("/shopping-list/items/{itemId:guid}", async (
            Guid itemId,
            UpdateShoppingListItemRequest? request,
            IIdentityAccessService identityAccessService,
            IFoodService foodService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            if (request is null)
            {
                return Results.BadRequest("A valid shopping update payload is required.");
            }

            if (!TryGetActiveHousehold(identityAccessService, out var householdId))
            {
                return Results.Forbid();
            }

            var userId = GetCurrentUserId(identityAccessService);
            var response = await foodService.UpdateShoppingListItemAsync(
                householdId,
                itemId,
                userId,
                request,
                clock.UtcNow,
                cancellationToken);

            return response is null ? Results.NotFound() : Results.Ok(response);
        });

        group.MapDelete("/shopping-list/items/{itemId:guid}", async (
            Guid itemId,
            IIdentityAccessService identityAccessService,
            IFoodService foodService,
            CancellationToken cancellationToken) =>
        {
            if (!TryGetActiveHousehold(identityAccessService, out var householdId))
            {
                return Results.Forbid();
            }

            var deleted = await foodService.DeleteShoppingListItemAsync(householdId, itemId, cancellationToken);
            return deleted ? Results.NoContent() : Results.NotFound();
        });

        group.MapPost("/shopping-lists/{shoppingListId:guid}/transfer-to-pantry", async (
            Guid shoppingListId,
            TransferToPantryRequest? request,
            IIdentityAccessService identityAccessService,
            IFoodService foodService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            if (request is null)
            {
                return Results.BadRequest("A valid pantry transfer payload is required.");
            }

            if (!TryGetActiveHousehold(identityAccessService, out var householdId))
            {
                return Results.Forbid();
            }

            var userId = GetCurrentUserId(identityAccessService);
            var response = await foodService.TransferShoppingListItemsToPantryAsync(
                householdId,
                shoppingListId,
                userId,
                request,
                clock.UtcNow,
                cancellationToken);

            return response is null ? Results.NotFound() : Results.Ok(response);
        });

        group.MapPost("/shopping-lists/{shoppingListId:guid}/complete", async (
            Guid shoppingListId,
            CompleteShoppingListRequest? request,
            IIdentityAccessService identityAccessService,
            IFoodService foodService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            if (!TryGetActiveHousehold(identityAccessService, out var householdId))
            {
                return Results.Forbid();
            }

            var userId = GetCurrentUserId(identityAccessService);
            var response = await foodService.CompleteShoppingListAsync(
                householdId,
                shoppingListId,
                userId,
                request ?? new CompleteShoppingListRequest(false),
                clock.UtcNow,
                cancellationToken);

            return response is null ? Results.NotFound() : Results.Ok(response);
        });

        group.MapPost("/cooking-sessions", async (
            StartCookingSessionRequest? request,
            IIdentityAccessService identityAccessService,
            IFoodService foodService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            if (request is null)
            {
                return Results.BadRequest("A valid cooking-session payload is required.");
            }

            if (!TryGetActiveHousehold(identityAccessService, out var householdId))
            {
                return Results.Forbid();
            }

            var userId = GetCurrentUserId(identityAccessService);
            var response = await foodService.StartCookingSessionAsync(
                householdId,
                userId,
                request,
                clock.UtcNow,
                cancellationToken);

            return Results.Ok(response);
        });

        group.MapGet("/cooking-sessions/{sessionId:guid}", async (
            Guid sessionId,
            IIdentityAccessService identityAccessService,
            IFoodService foodService,
            CancellationToken cancellationToken) =>
        {
            if (!TryGetActiveHousehold(identityAccessService, out var householdId))
            {
                return Results.Forbid();
            }

            var response = await foodService.GetCookingSessionAsync(householdId, sessionId, cancellationToken);
            return response is null ? Results.NotFound() : Results.Ok(response);
        });

        group.MapPatch("/cooking-sessions/{sessionId:guid}", async (
            Guid sessionId,
            UpdateCookingSessionRequest? request,
            IIdentityAccessService identityAccessService,
            IFoodService foodService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            if (request is null)
            {
                return Results.BadRequest("A valid cooking-session payload is required.");
            }

            if (!TryGetActiveHousehold(identityAccessService, out var householdId))
            {
                return Results.Forbid();
            }

            var response = await foodService.UpdateCookingSessionAsync(
                householdId,
                sessionId,
                request,
                clock.UtcNow,
                cancellationToken);

            return response is null ? Results.NotFound() : Results.Ok(response);
        });

        group.MapPatch("/cooking-sessions/{sessionId:guid}/ingredients/{sessionIngredientId:guid}", async (
            Guid sessionId,
            Guid sessionIngredientId,
            UpdateCookingIngredientRequest? request,
            IIdentityAccessService identityAccessService,
            IFoodService foodService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            if (request is null)
            {
                return Results.BadRequest("A valid cooking ingredient payload is required.");
            }

            if (!TryGetActiveHousehold(identityAccessService, out var householdId))
            {
                return Results.Forbid();
            }

            var response = await foodService.UpdateCookingIngredientAsync(
                householdId,
                sessionId,
                sessionIngredientId,
                request,
                clock.UtcNow,
                cancellationToken);

            return response is null ? Results.NotFound() : Results.Ok(response);
        });

        group.MapPatch("/cooking-sessions/{sessionId:guid}/steps/{sessionStepId:guid}", async (
            Guid sessionId,
            Guid sessionStepId,
            UpdateCookingStepRequest? request,
            IIdentityAccessService identityAccessService,
            IFoodService foodService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            if (request is null)
            {
                return Results.BadRequest("A valid cooking step payload is required.");
            }

            if (!TryGetActiveHousehold(identityAccessService, out var householdId))
            {
                return Results.Forbid();
            }

            var response = await foodService.UpdateCookingStepAsync(
                householdId,
                sessionId,
                sessionStepId,
                request,
                clock.UtcNow,
                cancellationToken);

            return response is null ? Results.NotFound() : Results.Ok(response);
        });

        group.MapPost("/cooking-sessions/{sessionId:guid}/complete", async (
            Guid sessionId,
            CompleteCookingSessionRequest? request,
            IIdentityAccessService identityAccessService,
            IFoodService foodService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            if (!TryGetActiveHousehold(identityAccessService, out var householdId))
            {
                return Results.Forbid();
            }

            var response = await foodService.CompleteCookingSessionAsync(
                householdId,
                sessionId,
                request ?? new CompleteCookingSessionRequest(),
                clock.UtcNow,
                cancellationToken);

            return response is null ? Results.NotFound() : Results.Ok(response);
        });

        group.MapDelete("/cooking-sessions/{sessionId:guid}", async (
            Guid sessionId,
            IIdentityAccessService identityAccessService,
            IFoodService foodService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            if (!TryGetActiveHousehold(identityAccessService, out var householdId))
            {
                return Results.Forbid();
            }

            var deleted = await foodService.DeleteCookingSessionAsync(
                householdId,
                sessionId,
                clock.UtcNow,
                cancellationToken);

            return deleted ? Results.NoContent() : Results.NotFound();
        });

        group.MapPost("/cooking-sessions/{sessionId:guid}/promote", async (
            Guid sessionId,
            PromoteCookingSessionRecipeRequest? request,
            IIdentityAccessService identityAccessService,
            IFoodService foodService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            if (!TryGetActiveHouseholdAndUser(identityAccessService, out var householdId, out var userId))
            {
                return Results.Forbid();
            }

            var response = await foodService.PromoteCookingSessionToRecipeAsync(
                householdId,
                sessionId,
                request ?? new PromoteCookingSessionRecipeRequest(null),
                userId,
                clock.UtcNow,
                cancellationToken);

            return response is null ? Results.NotFound() : Results.Ok(response);
        });

        group.MapGet("/cooking-sessions/{sessionId:guid}/tv", async (
            Guid sessionId,
            IIdentityAccessService identityAccessService,
            IFoodService foodService,
            CancellationToken cancellationToken) =>
        {
            if (!TryGetActiveHousehold(identityAccessService, out var householdId))
            {
                return Results.Forbid();
            }

            var response = await foodService.GetTvCookingDisplayAsync(householdId, sessionId, cancellationToken);
            return response is null ? Results.NotFound() : Results.Ok(response);
        });

        return app;
    }

    private static Guid? GetCurrentUserId(IIdentityAccessService identityAccessService)
    {
        var access = identityAccessService.GetCurrentAccess();
        return access.UserId;
    }

    private static bool TryGetActiveHousehold(
        IIdentityAccessService identityAccessService,
        out Guid householdId)
    {
        var access = identityAccessService.GetCurrentAccess();
        householdId = access.ActiveHouseholdId ?? Guid.Empty;
        return access.ActiveHouseholdId.HasValue;
    }

    private static bool TryGetActiveHouseholdAndUser(
        IIdentityAccessService identityAccessService,
        out Guid householdId,
        out Guid userId)
    {
        var access = identityAccessService.GetCurrentAccess();
        householdId = access.ActiveHouseholdId ?? Guid.Empty;
        userId = access.UserId ?? Guid.Empty;
        return access.ActiveHouseholdId.HasValue && access.UserId.HasValue;
    }
}
