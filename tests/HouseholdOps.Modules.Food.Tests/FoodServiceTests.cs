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
            new StartCookingSessionRequest(recipeId, PantryUpdateModes.Progressive),
            nowUtc,
            CancellationToken.None);

        var ingredient = Assert.Single(session.Ingredients);

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
