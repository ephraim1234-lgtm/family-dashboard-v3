using System;
using HouseholdOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HouseholdOps.Infrastructure.Persistence.Migrations;

[DbContext(typeof(HouseholdOpsDbContext))]
[Migration("20260418230000_FoodShoppingListTrips")]
public partial class FoodShoppingListTrips : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "Status",
            schema: "core",
            table: "shopping_lists",
            type: "character varying(32)",
            maxLength: 32,
            nullable: false,
            defaultValue: "Active");

        migrationBuilder.AddColumn<DateTimeOffset>(
            name: "CompletedAtUtc",
            schema: "core",
            table: "shopping_lists",
            type: "timestamp with time zone",
            nullable: true);

        migrationBuilder.AddColumn<DateTimeOffset>(
            name: "ArchivedAtUtc",
            schema: "core",
            table: "shopping_lists",
            type: "timestamp with time zone",
            nullable: true);

        migrationBuilder.AddColumn<Guid>(
            name: "CompletedByUserId",
            schema: "core",
            table: "shopping_lists",
            type: "uuid",
            nullable: true);

        migrationBuilder.AddColumn<int>(
            name: "ItemsPurchasedCount",
            schema: "core",
            table: "shopping_lists",
            type: "integer",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.AddColumn<string>(
            name: "CoreIngredientName",
            schema: "core",
            table: "shopping_list_items",
            type: "character varying(200)",
            maxLength: 200,
            nullable: false,
            defaultValue: "");

        migrationBuilder.AddColumn<string>(
            name: "Preparation",
            schema: "core",
            table: "shopping_list_items",
            type: "character varying(64)",
            maxLength: 64,
            nullable: true);

        migrationBuilder.AddColumn<decimal>(
            name: "QuantityNeeded",
            schema: "core",
            table: "shopping_list_items",
            type: "numeric(18,2)",
            precision: 18,
            scale: 2,
            nullable: true);

        migrationBuilder.AddColumn<decimal>(
            name: "QuantityPurchased",
            schema: "core",
            table: "shopping_list_items",
            type: "numeric(18,2)",
            precision: 18,
            scale: 2,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "UnitCanonical",
            schema: "core",
            table: "shopping_list_items",
            type: "character varying(32)",
            maxLength: 32,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "SourceRecipeIds",
            schema: "core",
            table: "shopping_list_items",
            type: "character varying(400)",
            maxLength: 400,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "SourceMealTitles",
            schema: "core",
            table: "shopping_list_items",
            type: "character varying(400)",
            maxLength: 400,
            nullable: true);

        migrationBuilder.AddColumn<Guid>(
            name: "SourceMealPlanSlotId",
            schema: "core",
            table: "shopping_list_items",
            type: "uuid",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "State",
            schema: "core",
            table: "shopping_list_items",
            type: "character varying(32)",
            maxLength: 32,
            nullable: false,
            defaultValue: "Needed");

        migrationBuilder.AddColumn<int>(
            name: "SortOrder",
            schema: "core",
            table: "shopping_list_items",
            type: "integer",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.AddColumn<string>(
            name: "AisleCategory",
            schema: "core",
            table: "shopping_list_items",
            type: "character varying(32)",
            maxLength: 32,
            nullable: true);

        migrationBuilder.AddColumn<Guid>(
            name: "ClaimedByUserId",
            schema: "core",
            table: "shopping_list_items",
            type: "uuid",
            nullable: true);

        migrationBuilder.AddColumn<DateTimeOffset>(
            name: "ClaimedAtUtc",
            schema: "core",
            table: "shopping_list_items",
            type: "timestamp with time zone",
            nullable: true);

        migrationBuilder.Sql("""
            UPDATE core.shopping_lists
            SET "Status" = 'Active',
                "ItemsPurchasedCount" = 0;
            """);

        migrationBuilder.Sql("""
            UPDATE core.shopping_list_items
            SET "CoreIngredientName" = "NormalizedIngredientName",
                "QuantityNeeded" = "Quantity",
                "QuantityPurchased" = CASE WHEN "IsCompleted" THEN "Quantity" ELSE NULL END,
                "UnitCanonical" = LOWER(COALESCE("Unit", '')),
                "SourceMealTitles" = "SourceMealTitle",
                "State" = CASE
                    WHEN "IsCompleted" THEN 'Purchased'
                    WHEN "Notes" = 'Pantry match needs review.' THEN 'NeedsReview'
                    ELSE 'Needed'
                END;
            """);

        migrationBuilder.CreateIndex(
            name: "IX_shopping_list_items_household_claimed",
            schema: "core",
            table: "shopping_list_items",
            columns: new[] { "HouseholdId", "ClaimedByUserId" },
            filter: "\"ClaimedByUserId\" IS NOT NULL");

        migrationBuilder.CreateIndex(
            name: "IX_shopping_list_items_household_core",
            schema: "core",
            table: "shopping_list_items",
            columns: new[] { "HouseholdId", "CoreIngredientName" });

        migrationBuilder.CreateIndex(
            name: "IX_shopping_list_items_list_state",
            schema: "core",
            table: "shopping_list_items",
            columns: new[] { "ShoppingListId", "State" });

        migrationBuilder.CreateIndex(
            name: "IX_shopping_list_items_SourceMealPlanSlotId",
            schema: "core",
            table: "shopping_list_items",
            column: "SourceMealPlanSlotId");

        migrationBuilder.CreateIndex(
            name: "IX_shopping_lists_household_active_default",
            schema: "core",
            table: "shopping_lists",
            column: "HouseholdId",
            unique: true,
            filter: "\"Status\" = 'Active' AND \"IsDefault\" = TRUE");

        migrationBuilder.CreateIndex(
            name: "IX_shopping_lists_household_status_completed",
            schema: "core",
            table: "shopping_lists",
            columns: new[] { "HouseholdId", "Status", "CompletedAtUtc" });

        migrationBuilder.AddForeignKey(
            name: "FK_shopping_list_items_meal_plan_slots_SourceMealPlanSlotId",
            schema: "core",
            table: "shopping_list_items",
            column: "SourceMealPlanSlotId",
            principalSchema: "core",
            principalTable: "meal_plan_slots",
            principalColumn: "Id",
            onDelete: ReferentialAction.SetNull);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(
            name: "FK_shopping_list_items_meal_plan_slots_SourceMealPlanSlotId",
            schema: "core",
            table: "shopping_list_items");

        migrationBuilder.DropIndex(
            name: "IX_shopping_list_items_household_claimed",
            schema: "core",
            table: "shopping_list_items");

        migrationBuilder.DropIndex(
            name: "IX_shopping_list_items_household_core",
            schema: "core",
            table: "shopping_list_items");

        migrationBuilder.DropIndex(
            name: "IX_shopping_list_items_list_state",
            schema: "core",
            table: "shopping_list_items");

        migrationBuilder.DropIndex(
            name: "IX_shopping_list_items_SourceMealPlanSlotId",
            schema: "core",
            table: "shopping_list_items");

        migrationBuilder.DropIndex(
            name: "IX_shopping_lists_household_active_default",
            schema: "core",
            table: "shopping_lists");

        migrationBuilder.DropIndex(
            name: "IX_shopping_lists_household_status_completed",
            schema: "core",
            table: "shopping_lists");

        migrationBuilder.DropColumn(name: "Status", schema: "core", table: "shopping_lists");
        migrationBuilder.DropColumn(name: "CompletedAtUtc", schema: "core", table: "shopping_lists");
        migrationBuilder.DropColumn(name: "ArchivedAtUtc", schema: "core", table: "shopping_lists");
        migrationBuilder.DropColumn(name: "CompletedByUserId", schema: "core", table: "shopping_lists");
        migrationBuilder.DropColumn(name: "ItemsPurchasedCount", schema: "core", table: "shopping_lists");

        migrationBuilder.DropColumn(name: "CoreIngredientName", schema: "core", table: "shopping_list_items");
        migrationBuilder.DropColumn(name: "Preparation", schema: "core", table: "shopping_list_items");
        migrationBuilder.DropColumn(name: "QuantityNeeded", schema: "core", table: "shopping_list_items");
        migrationBuilder.DropColumn(name: "QuantityPurchased", schema: "core", table: "shopping_list_items");
        migrationBuilder.DropColumn(name: "UnitCanonical", schema: "core", table: "shopping_list_items");
        migrationBuilder.DropColumn(name: "SourceRecipeIds", schema: "core", table: "shopping_list_items");
        migrationBuilder.DropColumn(name: "SourceMealTitles", schema: "core", table: "shopping_list_items");
        migrationBuilder.DropColumn(name: "SourceMealPlanSlotId", schema: "core", table: "shopping_list_items");
        migrationBuilder.DropColumn(name: "State", schema: "core", table: "shopping_list_items");
        migrationBuilder.DropColumn(name: "SortOrder", schema: "core", table: "shopping_list_items");
        migrationBuilder.DropColumn(name: "AisleCategory", schema: "core", table: "shopping_list_items");
        migrationBuilder.DropColumn(name: "ClaimedByUserId", schema: "core", table: "shopping_list_items");
        migrationBuilder.DropColumn(name: "ClaimedAtUtc", schema: "core", table: "shopping_list_items");
    }
}
