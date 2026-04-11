using HouseholdOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace HouseholdOps.Infrastructure.Persistence.Migrations;

[DbContext(typeof(HouseholdOpsDbContext))]
[Migration("202604110006_AddDisplayAgendaDensityMode")]
public partial class AddDisplayAgendaDensityMode : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "AgendaDensityMode",
            schema: "core",
            table: "display_devices",
            type: "character varying(32)",
            maxLength: 32,
            nullable: false,
            defaultValue: "Comfortable");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "AgendaDensityMode",
            schema: "core",
            table: "display_devices");
    }
}
