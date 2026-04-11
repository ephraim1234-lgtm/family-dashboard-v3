using HouseholdOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace HouseholdOps.Infrastructure.Persistence.Migrations;

[DbContext(typeof(HouseholdOpsDbContext))]
[Migration("202604110005_AddDisplayPresentationMode")]
public partial class AddDisplayPresentationMode : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "PresentationMode",
            schema: "core",
            table: "display_devices",
            type: "character varying(32)",
            maxLength: 32,
            nullable: false,
            defaultValue: "Balanced");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "PresentationMode",
            schema: "core",
            table: "display_devices");
    }
}
