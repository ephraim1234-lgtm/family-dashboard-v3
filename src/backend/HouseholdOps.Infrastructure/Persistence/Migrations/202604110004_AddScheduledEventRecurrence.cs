using System;
using HouseholdOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace HouseholdOps.Infrastructure.Persistence.Migrations;

[DbContext(typeof(HouseholdOpsDbContext))]
[Migration("202604110004_AddScheduledEventRecurrence")]
public partial class AddScheduledEventRecurrence : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "RecurrencePattern",
            schema: "core",
            table: "scheduled_events",
            type: "character varying(16)",
            maxLength: 16,
            nullable: false,
            defaultValue: "None");

        migrationBuilder.AddColumn<DateTimeOffset>(
            name: "RecursUntilUtc",
            schema: "core",
            table: "scheduled_events",
            type: "timestamp with time zone",
            nullable: true);

        migrationBuilder.AddColumn<int>(
            name: "WeeklyDaysMask",
            schema: "core",
            table: "scheduled_events",
            type: "integer",
            nullable: false,
            defaultValue: 0);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "RecurrencePattern",
            schema: "core",
            table: "scheduled_events");

        migrationBuilder.DropColumn(
            name: "RecursUntilUtc",
            schema: "core",
            table: "scheduled_events");

        migrationBuilder.DropColumn(
            name: "WeeklyDaysMask",
            schema: "core",
            table: "scheduled_events");
    }
}
