using HouseholdOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace HouseholdOps.Infrastructure.Persistence.Migrations;

[DbContext(typeof(HouseholdOpsDbContext))]
[Migration("202604140001_AddHouseholdTimeZoneId")]
public partial class AddHouseholdTimeZoneId : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "TimeZoneId",
            schema: "core",
            table: "households",
            type: "character varying(100)",
            maxLength: 100,
            nullable: false,
            defaultValue: "UTC");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "TimeZoneId",
            schema: "core",
            table: "households");
    }
}
