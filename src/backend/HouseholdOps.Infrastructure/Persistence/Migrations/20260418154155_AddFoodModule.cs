using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HouseholdOps.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddFoodModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "food_ingredients",
                schema: "core",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    NormalizedName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    DefaultUnit = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_food_ingredients", x => x.Id);
                    table.ForeignKey(
                        name: "FK_food_ingredients_households_HouseholdId",
                        column: x => x.HouseholdId,
                        principalSchema: "core",
                        principalTable: "households",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "meal_plan_slots",
                schema: "core",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                    RecipeId = table.Column<Guid>(type: "uuid", nullable: true),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    SlotName = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    RecipeTitleSnapshot = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_meal_plan_slots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_meal_plan_slots_households_HouseholdId",
                        column: x => x.HouseholdId,
                        principalSchema: "core",
                        principalTable: "households",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "pantry_locations",
                schema: "core",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pantry_locations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_pantry_locations_households_HouseholdId",
                        column: x => x.HouseholdId,
                        principalSchema: "core",
                        principalTable: "households",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "recipe_import_jobs",
                schema: "core",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    SourceUrl = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    ParserConfidence = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    ImportedTitle = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    ImportedYieldText = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ImportedSummary = table.Column<string>(type: "text", nullable: true),
                    SourceSiteName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    FailureReason = table.Column<string>(type: "text", nullable: true),
                    RawPayloadJson = table.Column<string>(type: "text", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ParsedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ConsumedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_recipe_import_jobs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_recipe_import_jobs_households_HouseholdId",
                        column: x => x.HouseholdId,
                        principalSchema: "core",
                        principalTable: "households",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "recipe_revisions",
                schema: "core",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                    RecipeId = table.Column<Guid>(type: "uuid", nullable: false),
                    BasedOnRevisionId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    Kind = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    RevisionNumber = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Summary = table.Column<string>(type: "text", nullable: true),
                    YieldText = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    Tags = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_recipe_revisions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_recipe_revisions_households_HouseholdId",
                        column: x => x.HouseholdId,
                        principalSchema: "core",
                        principalTable: "households",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "recipe_sources",
                schema: "core",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                    RecipeId = table.Column<Guid>(type: "uuid", nullable: true),
                    Kind = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    SourceUrl = table.Column<string>(type: "text", nullable: true),
                    SourceTitle = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    SourceSiteName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Attribution = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_recipe_sources", x => x.Id);
                    table.ForeignKey(
                        name: "FK_recipe_sources_households_HouseholdId",
                        column: x => x.HouseholdId,
                        principalSchema: "core",
                        principalTable: "households",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "recipes",
                schema: "core",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                    SourceId = table.Column<Guid>(type: "uuid", nullable: true),
                    ImportedSourceRevisionId = table.Column<Guid>(type: "uuid", nullable: true),
                    CurrentRevisionId = table.Column<Guid>(type: "uuid", nullable: true),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Summary = table.Column<string>(type: "text", nullable: true),
                    Tags = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_recipes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_recipes_households_HouseholdId",
                        column: x => x.HouseholdId,
                        principalSchema: "core",
                        principalTable: "households",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "shopping_lists",
                schema: "core",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    StoreName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_shopping_lists", x => x.Id);
                    table.ForeignKey(
                        name: "FK_shopping_lists_households_HouseholdId",
                        column: x => x.HouseholdId,
                        principalSchema: "core",
                        principalTable: "households",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "pantry_items",
                schema: "core",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                    IngredientId = table.Column<Guid>(type: "uuid", nullable: true),
                    PantryLocationId = table.Column<Guid>(type: "uuid", nullable: true),
                    IngredientName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    NormalizedIngredientName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Quantity = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    Unit = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    LowThreshold = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    PurchasedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ExpiresAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pantry_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_pantry_items_food_ingredients_IngredientId",
                        column: x => x.IngredientId,
                        principalSchema: "core",
                        principalTable: "food_ingredients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_pantry_items_households_HouseholdId",
                        column: x => x.HouseholdId,
                        principalSchema: "core",
                        principalTable: "households",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_pantry_items_pantry_locations_PantryLocationId",
                        column: x => x.PantryLocationId,
                        principalSchema: "core",
                        principalTable: "pantry_locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "recipe_ingredients",
                schema: "core",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RecipeRevisionId = table.Column<Guid>(type: "uuid", nullable: false),
                    IngredientId = table.Column<Guid>(type: "uuid", nullable: true),
                    Position = table.Column<int>(type: "integer", nullable: false),
                    IngredientName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    NormalizedIngredientName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Quantity = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    Unit = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    Preparation = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    IsOptional = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_recipe_ingredients", x => x.Id);
                    table.ForeignKey(
                        name: "FK_recipe_ingredients_food_ingredients_IngredientId",
                        column: x => x.IngredientId,
                        principalSchema: "core",
                        principalTable: "food_ingredients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_recipe_ingredients_recipe_revisions_RecipeRevisionId",
                        column: x => x.RecipeRevisionId,
                        principalSchema: "core",
                        principalTable: "recipe_revisions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "recipe_steps",
                schema: "core",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RecipeRevisionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Position = table.Column<int>(type: "integer", nullable: false),
                    Instruction = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_recipe_steps", x => x.Id);
                    table.ForeignKey(
                        name: "FK_recipe_steps_recipe_revisions_RecipeRevisionId",
                        column: x => x.RecipeRevisionId,
                        principalSchema: "core",
                        principalTable: "recipe_revisions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cooking_sessions",
                schema: "core",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                    RecipeId = table.Column<Guid>(type: "uuid", nullable: false),
                    RecipeRevisionId = table.Column<Guid>(type: "uuid", nullable: false),
                    MealPlanSlotId = table.Column<Guid>(type: "uuid", nullable: true),
                    StartedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    PantryUpdateMode = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    CurrentStepIndex = table.Column<int>(type: "integer", nullable: false),
                    StartedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CompletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cooking_sessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_cooking_sessions_households_HouseholdId",
                        column: x => x.HouseholdId,
                        principalSchema: "core",
                        principalTable: "households",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_cooking_sessions_recipes_RecipeId",
                        column: x => x.RecipeId,
                        principalSchema: "core",
                        principalTable: "recipes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "shopping_list_items",
                schema: "core",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                    ShoppingListId = table.Column<Guid>(type: "uuid", nullable: false),
                    IngredientId = table.Column<Guid>(type: "uuid", nullable: true),
                    PantryLocationId = table.Column<Guid>(type: "uuid", nullable: true),
                    IngredientName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    NormalizedIngredientName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Quantity = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    Unit = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    SourceRecipeTitle = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    IsCompleted = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CompletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_shopping_list_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_shopping_list_items_food_ingredients_IngredientId",
                        column: x => x.IngredientId,
                        principalSchema: "core",
                        principalTable: "food_ingredients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_shopping_list_items_households_HouseholdId",
                        column: x => x.HouseholdId,
                        principalSchema: "core",
                        principalTable: "households",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_shopping_list_items_shopping_lists_ShoppingListId",
                        column: x => x.ShoppingListId,
                        principalSchema: "core",
                        principalTable: "shopping_lists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cooking_session_ingredients",
                schema: "core",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CookingSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    RecipeIngredientId = table.Column<Guid>(type: "uuid", nullable: true),
                    Position = table.Column<int>(type: "integer", nullable: false),
                    IngredientName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    NormalizedIngredientName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    PlannedQuantity = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    PlannedUnit = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    ActualQuantity = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    ActualUnit = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    IsChecked = table.Column<bool>(type: "boolean", nullable: false),
                    IsSkipped = table.Column<bool>(type: "boolean", nullable: false),
                    PantryDeductedQuantity = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    PantryDeductionStatus = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cooking_session_ingredients", x => x.Id);
                    table.ForeignKey(
                        name: "FK_cooking_session_ingredients_cooking_sessions_CookingSession~",
                        column: x => x.CookingSessionId,
                        principalSchema: "core",
                        principalTable: "cooking_sessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cooking_session_steps",
                schema: "core",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CookingSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    RecipeStepId = table.Column<Guid>(type: "uuid", nullable: true),
                    Position = table.Column<int>(type: "integer", nullable: false),
                    Instruction = table.Column<string>(type: "text", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    IsCompleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cooking_session_steps", x => x.Id);
                    table.ForeignKey(
                        name: "FK_cooking_session_steps_cooking_sessions_CookingSessionId",
                        column: x => x.CookingSessionId,
                        principalSchema: "core",
                        principalTable: "cooking_sessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cooking_session_pantry_adjustments",
                schema: "core",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CookingSessionIngredientId = table.Column<Guid>(type: "uuid", nullable: false),
                    PantryItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    QuantityDelta = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Unit = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    AppliedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cooking_session_pantry_adjustments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_cooking_session_pantry_adjustments_cooking_session_ingredie~",
                        column: x => x.CookingSessionIngredientId,
                        principalSchema: "core",
                        principalTable: "cooking_session_ingredients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_cooking_session_pantry_adjustments_pantry_items_PantryItemId",
                        column: x => x.PantryItemId,
                        principalSchema: "core",
                        principalTable: "pantry_items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_cooking_session_ingredients_CookingSessionId",
                schema: "core",
                table: "cooking_session_ingredients",
                column: "CookingSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_cooking_session_pantry_adjustments_CookingSessionIngredient~",
                schema: "core",
                table: "cooking_session_pantry_adjustments",
                column: "CookingSessionIngredientId");

            migrationBuilder.CreateIndex(
                name: "IX_cooking_session_pantry_adjustments_PantryItemId",
                schema: "core",
                table: "cooking_session_pantry_adjustments",
                column: "PantryItemId");

            migrationBuilder.CreateIndex(
                name: "IX_cooking_session_steps_CookingSessionId",
                schema: "core",
                table: "cooking_session_steps",
                column: "CookingSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_cooking_sessions_HouseholdId",
                schema: "core",
                table: "cooking_sessions",
                column: "HouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_cooking_sessions_RecipeId",
                schema: "core",
                table: "cooking_sessions",
                column: "RecipeId");

            migrationBuilder.CreateIndex(
                name: "IX_food_ingredients_household_normalized_name",
                schema: "core",
                table: "food_ingredients",
                columns: new[] { "HouseholdId", "NormalizedName" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_food_ingredients_HouseholdId",
                schema: "core",
                table: "food_ingredients",
                column: "HouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_meal_plan_slots_household_date",
                schema: "core",
                table: "meal_plan_slots",
                columns: new[] { "HouseholdId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_meal_plan_slots_HouseholdId",
                schema: "core",
                table: "meal_plan_slots",
                column: "HouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_pantry_items_household_ingredient",
                schema: "core",
                table: "pantry_items",
                columns: new[] { "HouseholdId", "NormalizedIngredientName" });

            migrationBuilder.CreateIndex(
                name: "IX_pantry_items_HouseholdId",
                schema: "core",
                table: "pantry_items",
                column: "HouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_pantry_items_IngredientId",
                schema: "core",
                table: "pantry_items",
                column: "IngredientId");

            migrationBuilder.CreateIndex(
                name: "IX_pantry_items_PantryLocationId",
                schema: "core",
                table: "pantry_items",
                column: "PantryLocationId");

            migrationBuilder.CreateIndex(
                name: "IX_pantry_locations_household_name",
                schema: "core",
                table: "pantry_locations",
                columns: new[] { "HouseholdId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pantry_locations_HouseholdId",
                schema: "core",
                table: "pantry_locations",
                column: "HouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_recipe_import_jobs_HouseholdId",
                schema: "core",
                table: "recipe_import_jobs",
                column: "HouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_recipe_ingredients_IngredientId",
                schema: "core",
                table: "recipe_ingredients",
                column: "IngredientId");

            migrationBuilder.CreateIndex(
                name: "IX_recipe_ingredients_RecipeRevisionId",
                schema: "core",
                table: "recipe_ingredients",
                column: "RecipeRevisionId");

            migrationBuilder.CreateIndex(
                name: "IX_recipe_revisions_HouseholdId",
                schema: "core",
                table: "recipe_revisions",
                column: "HouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_recipe_revisions_recipe_number",
                schema: "core",
                table: "recipe_revisions",
                columns: new[] { "RecipeId", "RevisionNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_recipe_revisions_RecipeId",
                schema: "core",
                table: "recipe_revisions",
                column: "RecipeId");

            migrationBuilder.CreateIndex(
                name: "IX_recipe_sources_HouseholdId",
                schema: "core",
                table: "recipe_sources",
                column: "HouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_recipe_steps_RecipeRevisionId",
                schema: "core",
                table: "recipe_steps",
                column: "RecipeRevisionId");

            migrationBuilder.CreateIndex(
                name: "IX_recipes_HouseholdId",
                schema: "core",
                table: "recipes",
                column: "HouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_shopping_list_items_HouseholdId",
                schema: "core",
                table: "shopping_list_items",
                column: "HouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_shopping_list_items_IngredientId",
                schema: "core",
                table: "shopping_list_items",
                column: "IngredientId");

            migrationBuilder.CreateIndex(
                name: "IX_shopping_list_items_ShoppingListId",
                schema: "core",
                table: "shopping_list_items",
                column: "ShoppingListId");

            migrationBuilder.CreateIndex(
                name: "IX_shopping_lists_HouseholdId",
                schema: "core",
                table: "shopping_lists",
                column: "HouseholdId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "cooking_session_pantry_adjustments",
                schema: "core");

            migrationBuilder.DropTable(
                name: "cooking_session_steps",
                schema: "core");

            migrationBuilder.DropTable(
                name: "meal_plan_slots",
                schema: "core");

            migrationBuilder.DropTable(
                name: "recipe_import_jobs",
                schema: "core");

            migrationBuilder.DropTable(
                name: "recipe_ingredients",
                schema: "core");

            migrationBuilder.DropTable(
                name: "recipe_sources",
                schema: "core");

            migrationBuilder.DropTable(
                name: "recipe_steps",
                schema: "core");

            migrationBuilder.DropTable(
                name: "shopping_list_items",
                schema: "core");

            migrationBuilder.DropTable(
                name: "cooking_session_ingredients",
                schema: "core");

            migrationBuilder.DropTable(
                name: "pantry_items",
                schema: "core");

            migrationBuilder.DropTable(
                name: "recipe_revisions",
                schema: "core");

            migrationBuilder.DropTable(
                name: "shopping_lists",
                schema: "core");

            migrationBuilder.DropTable(
                name: "cooking_sessions",
                schema: "core");

            migrationBuilder.DropTable(
                name: "food_ingredients",
                schema: "core");

            migrationBuilder.DropTable(
                name: "pantry_locations",
                schema: "core");

            migrationBuilder.DropTable(
                name: "recipes",
                schema: "core");
        }
    }
}
