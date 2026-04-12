using System;
using HouseholdOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace HouseholdOps.Infrastructure.Persistence.Migrations;

[DbContext(typeof(HouseholdOpsDbContext))]
[Migration("202604120003_AddManagedGoogleCalendarSkipDetails")]
public partial class AddManagedGoogleCalendarSkipDetails : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(
            name: "SkippedRecurringOverrideCount",
            schema: "core",
            table: "google_calendar_connections",
            type: "integer",
            nullable: false,
            defaultValue: 0);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "SkippedRecurringOverrideCount",
            schema: "core",
            table: "google_calendar_connections");
    }
}
