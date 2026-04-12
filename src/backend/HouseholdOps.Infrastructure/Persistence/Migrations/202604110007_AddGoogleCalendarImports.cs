using System;
using HouseholdOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace HouseholdOps.Infrastructure.Persistence.Migrations;

[DbContext(typeof(HouseholdOpsDbContext))]
[Migration("202604110007_AddGoogleCalendarImports")]
public partial class AddGoogleCalendarImports : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<DateTimeOffset>(
            name: "LastImportedAtUtc",
            schema: "core",
            table: "scheduled_events",
            type: "timestamp with time zone",
            nullable: true);

        migrationBuilder.AddColumn<Guid>(
            name: "SourceCalendarId",
            schema: "core",
            table: "scheduled_events",
            type: "uuid",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "SourceEventId",
            schema: "core",
            table: "scheduled_events",
            type: "character varying(256)",
            maxLength: 256,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "SourceKind",
            schema: "core",
            table: "scheduled_events",
            type: "character varying(32)",
            maxLength: 32,
            nullable: true);

        migrationBuilder.CreateTable(
            name: "google_calendar_connections",
            schema: "core",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                DisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                FeedUrl = table.Column<string>(type: "text", nullable: false),
                CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                LastSyncStartedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                LastSyncCompletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                LastSyncStatus = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                LastSyncError = table.Column<string>(type: "text", nullable: true),
                ImportedEventCount = table.Column<int>(type: "integer", nullable: false),
                SkippedRecurringEventCount = table.Column<int>(type: "integer", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_google_calendar_connections", x => x.Id);
                table.ForeignKey(
                    name: "FK_google_calendar_connections_households_HouseholdId",
                    column: x => x.HouseholdId,
                    principalSchema: "core",
                    principalTable: "households",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_google_calendar_connections_HouseholdId",
            schema: "core",
            table: "google_calendar_connections",
            column: "HouseholdId");

        migrationBuilder.CreateIndex(
            name: "IX_scheduled_events_source_identity",
            schema: "core",
            table: "scheduled_events",
            columns: new[] { "HouseholdId", "SourceKind", "SourceCalendarId", "SourceEventId" },
            unique: true,
            filter: "\"SourceKind\" IS NOT NULL AND \"SourceCalendarId\" IS NOT NULL AND \"SourceEventId\" IS NOT NULL");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "google_calendar_connections",
            schema: "core");

        migrationBuilder.DropIndex(
            name: "IX_scheduled_events_source_identity",
            schema: "core",
            table: "scheduled_events");

        migrationBuilder.DropColumn(
            name: "LastImportedAtUtc",
            schema: "core",
            table: "scheduled_events");

        migrationBuilder.DropColumn(
            name: "SourceCalendarId",
            schema: "core",
            table: "scheduled_events");

        migrationBuilder.DropColumn(
            name: "SourceEventId",
            schema: "core",
            table: "scheduled_events");

        migrationBuilder.DropColumn(
            name: "SourceKind",
            schema: "core",
            table: "scheduled_events");
    }
}
