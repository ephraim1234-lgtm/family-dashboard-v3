using System;
using HouseholdOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace HouseholdOps.Infrastructure.Persistence.Migrations;

[DbContext(typeof(HouseholdOpsDbContext))]
[Migration("202604110008_AddGoogleCalendarAutoSync")]
public partial class AddGoogleCalendarAutoSync : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "AutoSyncEnabled",
            schema: "core",
            table: "google_calendar_connections",
            type: "boolean",
            nullable: false,
            defaultValue: true);

        migrationBuilder.AddColumn<DateTimeOffset>(
            name: "NextSyncDueAtUtc",
            schema: "core",
            table: "google_calendar_connections",
            type: "timestamp with time zone",
            nullable: true);

        migrationBuilder.AddColumn<int>(
            name: "SyncIntervalMinutes",
            schema: "core",
            table: "google_calendar_connections",
            type: "integer",
            nullable: false,
            defaultValue: 30);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "AutoSyncEnabled",
            schema: "core",
            table: "google_calendar_connections");

        migrationBuilder.DropColumn(
            name: "NextSyncDueAtUtc",
            schema: "core",
            table: "google_calendar_connections");

        migrationBuilder.DropColumn(
            name: "SyncIntervalMinutes",
            schema: "core",
            table: "google_calendar_connections");
    }
}
