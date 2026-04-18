using System;
using HouseholdOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HouseholdOps.Infrastructure.Persistence.Migrations;

[DbContext(typeof(HouseholdOpsDbContext))]
[Migration("20260418183000_FoodPhase1CoreLoop")]
public partial class FoodPhase1CoreLoop : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "Title",
            schema: "core",
            table: "meal_plan_slots",
            type: "character varying(200)",
            maxLength: 200,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "SourceMealTitle",
            schema: "core",
            table: "shopping_list_items",
            type: "character varying(200)",
            maxLength: 200,
            nullable: true);

        migrationBuilder.AddColumn<Guid>(
            name: "FocusedCookingSessionRecipeId",
            schema: "core",
            table: "cooking_sessions",
            type: "uuid",
            nullable: true);

        migrationBuilder.AddColumn<Guid>(
            name: "CookingSessionRecipeId",
            schema: "core",
            table: "cooking_session_steps",
            type: "uuid",
            nullable: true);

        migrationBuilder.AddColumn<Guid>(
            name: "CookingSessionRecipeId",
            schema: "core",
            table: "cooking_session_ingredients",
            type: "uuid",
            nullable: true);

        migrationBuilder.CreateTable(
            name: "cooking_session_recipes",
            schema: "core",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                CookingSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                RecipeId = table.Column<Guid>(type: "uuid", nullable: false),
                RecipeRevisionId = table.Column<Guid>(type: "uuid", nullable: false),
                Role = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                Position = table.Column<int>(type: "integer", nullable: false),
                Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                CurrentStepIndex = table.Column<int>(type: "integer", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_cooking_session_recipes", x => x.Id);
                table.ForeignKey(
                    name: "FK_cooking_session_recipes_cooking_sessions_CookingSessionId",
                    column: x => x.CookingSessionId,
                    principalSchema: "core",
                    principalTable: "cooking_sessions",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_cooking_session_recipes_recipes_RecipeId",
                    column: x => x.RecipeId,
                    principalSchema: "core",
                    principalTable: "recipes",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "meal_plan_recipes",
            schema: "core",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                MealPlanSlotId = table.Column<Guid>(type: "uuid", nullable: false),
                RecipeId = table.Column<Guid>(type: "uuid", nullable: false),
                RecipeRevisionId = table.Column<Guid>(type: "uuid", nullable: false),
                Role = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                Position = table.Column<int>(type: "integer", nullable: false),
                RecipeTitleSnapshot = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_meal_plan_recipes", x => x.Id);
                table.ForeignKey(
                    name: "FK_meal_plan_recipes_meal_plan_slots_MealPlanSlotId",
                    column: x => x.MealPlanSlotId,
                    principalSchema: "core",
                    principalTable: "meal_plan_slots",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_meal_plan_recipes_recipes_RecipeId",
                    column: x => x.RecipeId,
                    principalSchema: "core",
                    principalTable: "recipes",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "pantry_item_activities",
            schema: "core",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                PantryItemId = table.Column<Guid>(type: "uuid", nullable: false),
                Kind = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                QuantityDelta = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                QuantityAfter = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                Unit = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                Note = table.Column<string>(type: "text", nullable: true),
                SourceLabel = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                OccurredAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_pantry_item_activities", x => x.Id);
                table.ForeignKey(
                    name: "FK_pantry_item_activities_households_HouseholdId",
                    column: x => x.HouseholdId,
                    principalSchema: "core",
                    principalTable: "households",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_pantry_item_activities_pantry_items_PantryItemId",
                    column: x => x.PantryItemId,
                    principalSchema: "core",
                    principalTable: "pantry_items",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_cooking_session_ingredients_CookingSessionRecipeId",
            schema: "core",
            table: "cooking_session_ingredients",
            column: "CookingSessionRecipeId");

        migrationBuilder.CreateIndex(
            name: "IX_cooking_session_steps_CookingSessionRecipeId",
            schema: "core",
            table: "cooking_session_steps",
            column: "CookingSessionRecipeId");

        migrationBuilder.CreateIndex(
            name: "IX_cooking_session_recipes_CookingSessionId",
            schema: "core",
            table: "cooking_session_recipes",
            column: "CookingSessionId");

        migrationBuilder.CreateIndex(
            name: "IX_cooking_session_recipes_RecipeId",
            schema: "core",
            table: "cooking_session_recipes",
            column: "RecipeId");

        migrationBuilder.CreateIndex(
            name: "IX_cooking_session_recipes_session_position",
            schema: "core",
            table: "cooking_session_recipes",
            columns: new[] { "CookingSessionId", "Position" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_meal_plan_recipes_MealPlanSlotId",
            schema: "core",
            table: "meal_plan_recipes",
            column: "MealPlanSlotId");

        migrationBuilder.CreateIndex(
            name: "IX_meal_plan_recipes_RecipeId",
            schema: "core",
            table: "meal_plan_recipes",
            column: "RecipeId");

        migrationBuilder.CreateIndex(
            name: "IX_meal_plan_recipes_slot_position",
            schema: "core",
            table: "meal_plan_recipes",
            columns: new[] { "MealPlanSlotId", "Position" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_pantry_item_activities_HouseholdId",
            schema: "core",
            table: "pantry_item_activities",
            column: "HouseholdId");

        migrationBuilder.CreateIndex(
            name: "IX_pantry_item_activities_item_occurred",
            schema: "core",
            table: "pantry_item_activities",
            columns: new[] { "PantryItemId", "OccurredAtUtc" });

        migrationBuilder.AddForeignKey(
            name: "FK_cooking_session_ingredients_cooking_session_recipes_CookingSessionRecipeId",
            schema: "core",
            table: "cooking_session_ingredients",
            column: "CookingSessionRecipeId",
            principalSchema: "core",
            principalTable: "cooking_session_recipes",
            principalColumn: "Id",
            onDelete: ReferentialAction.SetNull);

        migrationBuilder.AddForeignKey(
            name: "FK_cooking_session_steps_cooking_session_recipes_CookingSessionRecipeId",
            schema: "core",
            table: "cooking_session_steps",
            column: "CookingSessionRecipeId",
            principalSchema: "core",
            principalTable: "cooking_session_recipes",
            principalColumn: "Id",
            onDelete: ReferentialAction.SetNull);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(
            name: "FK_cooking_session_ingredients_cooking_session_recipes_CookingSessionRecipeId",
            schema: "core",
            table: "cooking_session_ingredients");

        migrationBuilder.DropForeignKey(
            name: "FK_cooking_session_steps_cooking_session_recipes_CookingSessionRecipeId",
            schema: "core",
            table: "cooking_session_steps");

        migrationBuilder.DropTable(
            name: "meal_plan_recipes",
            schema: "core");

        migrationBuilder.DropTable(
            name: "pantry_item_activities",
            schema: "core");

        migrationBuilder.DropTable(
            name: "cooking_session_recipes",
            schema: "core");

        migrationBuilder.DropIndex(
            name: "IX_cooking_session_ingredients_CookingSessionRecipeId",
            schema: "core",
            table: "cooking_session_ingredients");

        migrationBuilder.DropIndex(
            name: "IX_cooking_session_steps_CookingSessionRecipeId",
            schema: "core",
            table: "cooking_session_steps");

        migrationBuilder.DropColumn(
            name: "CookingSessionRecipeId",
            schema: "core",
            table: "cooking_session_ingredients");

        migrationBuilder.DropColumn(
            name: "CookingSessionRecipeId",
            schema: "core",
            table: "cooking_session_steps");

        migrationBuilder.DropColumn(
            name: "FocusedCookingSessionRecipeId",
            schema: "core",
            table: "cooking_sessions");

        migrationBuilder.DropColumn(
            name: "Title",
            schema: "core",
            table: "meal_plan_slots");

        migrationBuilder.DropColumn(
            name: "SourceMealTitle",
            schema: "core",
            table: "shopping_list_items");
    }
}
