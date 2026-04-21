using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HouseholdOps.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class FoodImageLinks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DefaultImageUrl",
                schema: "core",
                table: "food_ingredients",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImageUrlOverride",
                schema: "core",
                table: "pantry_items",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                schema: "core",
                table: "recipes",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DefaultImageUrl",
                schema: "core",
                table: "food_ingredients");

            migrationBuilder.DropColumn(
                name: "ImageUrlOverride",
                schema: "core",
                table: "pantry_items");

            migrationBuilder.DropColumn(
                name: "ImageUrl",
                schema: "core",
                table: "recipes");
        }
    }
}
