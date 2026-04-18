using System.Net;
using System.Text;
using HouseholdOps.Infrastructure.Food;
using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Modules.Food;
using HouseholdOps.Modules.Food.Contracts;
using HouseholdOps.Modules.Households;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HouseholdOps.Modules.Food.Tests;

public class FoodServiceTests
{
    private static readonly Guid HouseholdId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private static readonly Guid UserId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");

    [Fact]
    public async Task CreateRecipeImportAsync_Parses_Schema_Recipe_Into_Review()
    {
        await using var dbContext = CreateDbContext();
        var html = """
            <html>
              <head>
                <script type="application/ld+json">
                {
                  "@context":"https://schema.org",
                  "@type":"Recipe",
                  "name":"Sheet Pan Fajitas",
                  "description":"Fast weeknight dinner",
                  "recipeYield":"4 servings",
                  "recipeIngredient":[
                    "1 lb chicken breast",
                    "2 bell peppers",
                    "1 onion"
                  ],
                  "recipeInstructions":[
                    {"@type":"HowToStep","text":"Slice the vegetables."},
                    {"@type":"HowToStep","text":"Roast everything on the pan."}
                  ]
                }
                </script>
              </head>
            </html>
            """;

        var service = new FoodService(
            dbContext,
            new FakeHttpClientFactory(new HttpClient(new StubHttpHandler(html))));

        var review = await service.CreateRecipeImportAsync(
            HouseholdId,
            UserId,
            new CreateRecipeImportRequest("https://example.com/fajitas"),
            DateTimeOffset.UtcNow,
            CancellationToken.None);

        Assert.Equal("Sheet Pan Fajitas", review.Title);
        Assert.Equal("4 servings", review.YieldText);
        Assert.Equal(3, review.Ingredients.Count);
        Assert.Equal("chicken breast", review.Ingredients[0].IngredientName);
        Assert.Equal(2, review.Steps.Count);
        Assert.Equal("Parsed", review.Status);
    }

    [Fact]
    public async Task SaveRecipeAsync_Creates_Manual_Household_Recipe()
    {
        await using var dbContext = CreateDbContext();
        var nowUtc = new DateTimeOffset(2026, 4, 18, 12, 0, 0, TimeSpan.Zero);
        var service = new FoodService(
            dbContext,
            new FakeHttpClientFactory(new HttpClient(new StubHttpHandler(string.Empty))));

        var recipe = await service.SaveRecipeAsync(
            HouseholdId,
            UserId,
            new SaveRecipeRequest(
                ImportJobId: null,
                Title: "Family Pancakes",
                Summary: "Weekend breakfast",
                YieldText: "4 servings",
                Tags: "breakfast",
                Notes: "Add vanilla",
                Ingredients:
                [
                    new RecipeEditableIngredientRequest("Flour", 2, "cups", null, false),
                    new RecipeEditableIngredientRequest("Eggs", 2, "count", null, false)
                ],
                Steps:
                [
                    new RecipeEditableStepRequest(1, "Whisk the batter."),
                    new RecipeEditableStepRequest(2, "Cook on a griddle.")
                ]),
            nowUtc,
            CancellationToken.None);

        Assert.Equal("Family Pancakes", recipe.Title);
        Assert.Equal("Manual", recipe.Source?.Kind);
        Assert.Equal(2, recipe.HouseholdDefaultRevision.Ingredients.Count);
        Assert.Equal(2, recipe.RevisionCount);
    }

    [Fact]
    public async Task UpdateRecipeAsync_Creates_New_Household_Default_Revision()
    {
        await using var dbContext = CreateDbContext();
        var nowUtc = new DateTimeOffset(2026, 4, 18, 12, 0, 0, TimeSpan.Zero);
        var service = new FoodService(
            dbContext,
            new FakeHttpClientFactory(new HttpClient(new StubHttpHandler(string.Empty))));

        var recipe = await CreateRecipeAsync(service, nowUtc, "Family Chili", "Beans", 2);

        var updated = await service.UpdateRecipeAsync(
            HouseholdId,
            recipe.Id,
            UserId,
            new UpdateRecipeRequest(
                Title: "Family Chili",
                Summary: "Weeknight favorite",
                YieldText: "6 servings",
                Tags: "dinner, favorite",
                Notes: "Use smoked paprika",
                Ingredients:
                [
                    new RecipeEditableIngredientRequest("Beans", 3, "cans", null, false),
                    new RecipeEditableIngredientRequest("Ground turkey", 1, "lb", null, false)
                ],
                Steps:
                [
                    new RecipeEditableStepRequest(1, "Brown the turkey."),
                    new RecipeEditableStepRequest(2, "Simmer with beans.")
                ]),
            nowUtc.AddMinutes(5),
            CancellationToken.None);

        Assert.NotNull(updated);
        Assert.Equal(3, updated!.RevisionCount);
        Assert.Equal("Weeknight favorite", updated.Summary);
        Assert.Equal(2, updated.HouseholdDefaultRevision.Steps.Count);
        Assert.Equal(3, updated.HouseholdDefaultRevision.Ingredients[0].Quantity);
        Assert.Equal("cans", updated.HouseholdDefaultRevision.Ingredients[0].Unit);
        Assert.Equal("Family Chili", updated.ImportedSourceRevision.Title);
    }

    [Fact]
    public async Task CreateMealPlanSlotAsync_Allows_Multiple_Recipes_Per_Meal()
    {
        await using var dbContext = CreateDbContext();
        var nowUtc = new DateTimeOffset(2026, 4, 18, 12, 0, 0, TimeSpan.Zero);
        var service = new FoodService(
            dbContext,
            new FakeHttpClientFactory(new HttpClient(new StubHttpHandler(string.Empty))));

        var tacos = await CreateRecipeAsync(service, nowUtc, "Chicken Tacos", "Chicken", 1);
        var rice = await CreateRecipeAsync(service, nowUtc, "Cilantro Rice", "Rice", 1);

        var slot = await service.CreateMealPlanSlotAsync(
            HouseholdId,
            new CreateMealPlanSlotRequest(
                RecipeId: null,
                Date: new DateOnly(2026, 4, 18),
                SlotName: "Dinner",
                Title: "Taco night",
                Notes: "Use leftovers for lunch",
                GenerateShoppingList: false,
                Recipes:
                [
                    new CreateMealPlanRecipeRequest(tacos.Id, "Main"),
                    new CreateMealPlanRecipeRequest(rice.Id, "Side")
                ]),
            nowUtc,
            CancellationToken.None);

        Assert.NotNull(slot);
        Assert.Equal("Taco night", slot!.Title);
        Assert.Equal(2, slot.Recipes.Count);
        Assert.Equal("Main", slot.Recipes[0].Role);
        Assert.Equal("Side", slot.Recipes[1].Role);
    }

    [Fact]
    public async Task StartCookingSessionAsync_ForMealSlot_Returns_Multiple_Recipes_And_TotalIngredients()
    {
        await using var dbContext = CreateDbContext();
        var nowUtc = new DateTimeOffset(2026, 4, 18, 12, 0, 0, TimeSpan.Zero);
        var service = new FoodService(
            dbContext,
            new FakeHttpClientFactory(new HttpClient(new StubHttpHandler(string.Empty))));

        var tacos = await CreateRecipeAsync(service, nowUtc, "Chicken Tacos", "Chicken", 1);
        var salsa = await CreateRecipeAsync(service, nowUtc, "Fresh Salsa", "Tomato", 2);

        var mealSlot = await service.CreateMealPlanSlotAsync(
            HouseholdId,
            new CreateMealPlanSlotRequest(
                RecipeId: null,
                Date: new DateOnly(2026, 4, 18),
                SlotName: "Dinner",
                Title: "Taco night",
                Notes: null,
                GenerateShoppingList: false,
                Recipes:
                [
                    new CreateMealPlanRecipeRequest(tacos.Id, "Main"),
                    new CreateMealPlanRecipeRequest(salsa.Id, "Sauce")
                ]),
            nowUtc,
            CancellationToken.None);

        var session = await service.StartCookingSessionAsync(
            HouseholdId,
            UserId,
            new StartCookingSessionRequest(
                RecipeId: null,
                MealPlanSlotId: mealSlot!.Id,
                PantryUpdateMode: PantryUpdateModes.Progressive),
            nowUtc,
            CancellationToken.None);

        Assert.Equal("Taco night", session.Title);
        Assert.Equal(2, session.RecipeCount);
        Assert.Equal(2, session.Recipes.Count);
        Assert.Contains(session.TotalIngredients, item => item.IngredientName.Contains("Chicken", StringComparison.OrdinalIgnoreCase));
        Assert.Equal("Chicken Tacos", session.Recipes[0].Title);
    }

    [Fact]
    public async Task CreateMealPlanSlotAsync_GenerateShoppingList_Combines_Compatible_Ingredients_And_Separates_Uncertain_Units()
    {
        await using var dbContext = CreateDbContext();
        var nowUtc = new DateTimeOffset(2026, 4, 18, 12, 0, 0, TimeSpan.Zero);
        var service = new FoodService(
            dbContext,
            new FakeHttpClientFactory(new HttpClient(new StubHttpHandler(string.Empty))));

        var tacos = await service.SaveRecipeAsync(
            HouseholdId,
            UserId,
            new SaveRecipeRequest(
                ImportJobId: null,
                Title: "Chicken Tacos",
                Summary: null,
                YieldText: "4 servings",
                Tags: null,
                Notes: null,
                Ingredients:
                [
                    new RecipeEditableIngredientRequest("Chicken", 1, "lb", null, false),
                    new RecipeEditableIngredientRequest("Cilantro", 1, "bunch", null, false)
                ],
                Steps:
                [
                    new RecipeEditableStepRequest(1, "Cook the chicken.")
                ]),
            nowUtc,
            CancellationToken.None);

        var salsa = await service.SaveRecipeAsync(
            HouseholdId,
            UserId,
            new SaveRecipeRequest(
                ImportJobId: null,
                Title: "Fresh Salsa",
                Summary: null,
                YieldText: "4 servings",
                Tags: null,
                Notes: null,
                Ingredients:
                [
                    new RecipeEditableIngredientRequest("Chicken", 2, "lb", null, false),
                    new RecipeEditableIngredientRequest("Cilantro", null, null, null, false)
                ],
                Steps:
                [
                    new RecipeEditableStepRequest(1, "Mix the salsa.")
                ]),
            nowUtc,
            CancellationToken.None);

        var slot = await service.CreateMealPlanSlotAsync(
            HouseholdId,
            new CreateMealPlanSlotRequest(
                RecipeId: null,
                Date: new DateOnly(2026, 4, 19),
                SlotName: "Dinner",
                Title: "Taco night",
                Notes: null,
                GenerateShoppingList: true,
                Recipes:
                [
                    new CreateMealPlanRecipeRequest(tacos.Id, "Main"),
                    new CreateMealPlanRecipeRequest(salsa.Id, "Sauce")
                ]),
            nowUtc,
            CancellationToken.None);

        Assert.NotNull(slot);

        var shoppingItems = await dbContext.ShoppingListItems
            .OrderBy(item => item.IngredientName)
            .ToListAsync();

        var chicken = Assert.Single(shoppingItems.Where(item =>
            item.NormalizedIngredientName == "chicken" && item.Unit == "lb"));
        Assert.Equal(3, chicken.Quantity);
        Assert.Contains("Chicken Tacos", chicken.SourceRecipeTitle ?? string.Empty, StringComparison.Ordinal);
        Assert.Contains("Fresh Salsa", chicken.SourceRecipeTitle ?? string.Empty, StringComparison.Ordinal);

        var cilantroItems = shoppingItems
            .Where(item => item.NormalizedIngredientName == "cilantro")
            .ToList();
        Assert.Equal(2, cilantroItems.Count);
        Assert.Contains(cilantroItems, item => item.Unit == "bunch" && item.Quantity == 1);
        Assert.Contains(cilantroItems, item => item.Unit is null && item.Quantity is null);
    }

    [Fact]
    public async Task UpdateCookingIngredientAsync_Uses_Actual_Quantity_And_Reverses_Previous_Deduction()
    {
        await using var dbContext = CreateDbContext();
        var nowUtc = new DateTimeOffset(2026, 4, 17, 12, 0, 0, TimeSpan.Zero);
        var ingredientId = Guid.NewGuid();
        var recipeId = Guid.NewGuid();
        var revisionId = Guid.NewGuid();

        dbContext.FoodIngredients.Add(new FoodIngredient
        {
            Id = ingredientId,
            HouseholdId = HouseholdId,
            Name = "Onion",
            NormalizedName = "onion",
            DefaultUnit = "count",
            CreatedAtUtc = nowUtc
        });

        dbContext.Recipes.Add(new Recipe
        {
            Id = recipeId,
            HouseholdId = HouseholdId,
            Title = "Tacos",
            CreatedAtUtc = nowUtc,
            UpdatedAtUtc = nowUtc,
            CurrentRevisionId = revisionId,
            ImportedSourceRevisionId = revisionId
        });

        dbContext.RecipeRevisions.Add(new RecipeRevision
        {
            Id = revisionId,
            HouseholdId = HouseholdId,
            RecipeId = recipeId,
            Kind = RecipeRevisionKinds.HouseholdDefault,
            RevisionNumber = 1,
            Title = "Tacos",
            CreatedByUserId = UserId,
            CreatedAtUtc = nowUtc
        });

        dbContext.RecipeIngredients.Add(new RecipeIngredient
        {
            Id = Guid.NewGuid(),
            RecipeRevisionId = revisionId,
            IngredientId = ingredientId,
            Position = 1,
            IngredientName = "Onion",
            NormalizedIngredientName = "onion",
            Quantity = 2,
            Unit = "count"
        });

        dbContext.RecipeSteps.Add(new RecipeStep
        {
            Id = Guid.NewGuid(),
            RecipeRevisionId = revisionId,
            Position = 1,
            Instruction = "Cook the onions."
        });

        dbContext.PantryLocations.Add(new PantryLocation
        {
            Id = Guid.NewGuid(),
            HouseholdId = HouseholdId,
            Name = "Pantry",
            SortOrder = 1,
            CreatedAtUtc = nowUtc
        });

        var pantryItem = new PantryItem
        {
            Id = Guid.NewGuid(),
            HouseholdId = HouseholdId,
            IngredientId = ingredientId,
            IngredientName = "Onion",
            NormalizedIngredientName = "onion",
            Quantity = 5,
            Unit = "count",
            UpdatedAtUtc = nowUtc,
            Status = "InStock"
        };
        dbContext.PantryItems.Add(pantryItem);
        await dbContext.SaveChangesAsync();

        var service = new FoodService(
            dbContext,
            new FakeHttpClientFactory(new HttpClient(new StubHttpHandler(string.Empty))));

        var session = await service.StartCookingSessionAsync(
            HouseholdId,
            UserId,
            new StartCookingSessionRequest(recipeId, null, PantryUpdateModes.Progressive),
            nowUtc,
            CancellationToken.None);

        var ingredient = Assert.Single(session.Recipes[0].Ingredients);

        await service.UpdateCookingIngredientAsync(
            HouseholdId,
            session.Id,
            ingredient.Id,
            new UpdateCookingIngredientRequest(true, false, 1, "count", null),
            nowUtc.AddMinutes(5),
            CancellationToken.None);

        var afterFirstUse = await dbContext.PantryItems.SingleAsync(item => item.Id == pantryItem.Id);
        Assert.Equal(4, afterFirstUse.Quantity);

        await service.UpdateCookingIngredientAsync(
            HouseholdId,
            session.Id,
            ingredient.Id,
            new UpdateCookingIngredientRequest(true, false, 3, "count", null),
            nowUtc.AddMinutes(10),
            CancellationToken.None);

        var afterEdit = await dbContext.PantryItems.SingleAsync(item => item.Id == pantryItem.Id);
        Assert.Equal(2, afterEdit.Quantity);

        var historyCount = await dbContext.PantryItemActivities.CountAsync(item => item.PantryItemId == pantryItem.Id);
        Assert.True(historyCount >= 2);
    }

    private static async Task<RecipeDetailResponse> CreateRecipeAsync(
        FoodService service,
        DateTimeOffset nowUtc,
        string title,
        string ingredientName,
        decimal quantity)
    {
        return await service.SaveRecipeAsync(
            HouseholdId,
            UserId,
            new SaveRecipeRequest(
                ImportJobId: null,
                Title: title,
                Summary: null,
                YieldText: "4 servings",
                Tags: null,
                Notes: null,
                Ingredients:
                [
                    new RecipeEditableIngredientRequest(ingredientName, quantity, "count", null, false)
                ],
                Steps:
                [
                    new RecipeEditableStepRequest(1, $"Cook the {ingredientName}.")
                ]),
            nowUtc,
            CancellationToken.None);
    }

    private static HouseholdOpsDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<HouseholdOpsDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options;

        var dbContext = new HouseholdOpsDbContext(options);
        dbContext.Households.Add(new Household
        {
            Id = HouseholdId,
            Name = "Test Household",
            TimeZoneId = "UTC",
            CreatedAtUtc = DateTimeOffset.UtcNow.AddDays(-30)
        });
        dbContext.SaveChanges();
        return dbContext;
    }

    private sealed class FakeHttpClientFactory(HttpClient client) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => client;
    }

    private sealed class StubHttpHandler(string responseBody) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(responseBody, Encoding.UTF8, "text/html")
            });
    }
}
