using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HouseholdOps.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOutboundGoogleLocalEventSync : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_google_calendar_connections_HouseholdId",
                schema: "core",
                table: "google_calendar_connections");

            migrationBuilder.AddColumn<bool>(
                name: "OutboundSyncEnabled",
                schema: "core",
                table: "google_calendar_connections",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "google_calendar_local_event_syncs",
                schema: "core",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                    ScheduledEventId = table.Column<Guid>(type: "uuid", nullable: false),
                    GoogleCalendarConnectionId = table.Column<Guid>(type: "uuid", nullable: false),
                    RemoteEventId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    SyncStatus = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    PendingOperation = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    LastQueuedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    NextAttemptAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LastAttemptedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LastSucceededAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    AttemptCount = table.Column<int>(type: "integer", nullable: false),
                    LastError = table.Column<string>(type: "text", nullable: true),
                    MarkedDeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_google_calendar_local_event_syncs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_google_calendar_local_event_syncs_google_calendar_connectio~",
                        column: x => x.GoogleCalendarConnectionId,
                        principalSchema: "core",
                        principalTable: "google_calendar_connections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_google_calendar_local_event_syncs_households_HouseholdId",
                        column: x => x.HouseholdId,
                        principalSchema: "core",
                        principalTable: "households",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_google_calendar_connections_household_outbound_target",
                schema: "core",
                table: "google_calendar_connections",
                column: "HouseholdId",
                unique: true,
                filter: "\"OutboundSyncEnabled\" = TRUE");

            migrationBuilder.CreateIndex(
                name: "IX_google_calendar_local_event_syncs_household_event",
                schema: "core",
                table: "google_calendar_local_event_syncs",
                columns: new[] { "HouseholdId", "ScheduledEventId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_google_calendar_local_event_syncs_HouseholdId",
                schema: "core",
                table: "google_calendar_local_event_syncs",
                column: "HouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_google_calendar_local_event_syncs_link_status",
                schema: "core",
                table: "google_calendar_local_event_syncs",
                columns: new[] { "GoogleCalendarConnectionId", "SyncStatus" });

            migrationBuilder.CreateIndex(
                name: "IX_google_calendar_local_event_syncs_pending_due",
                schema: "core",
                table: "google_calendar_local_event_syncs",
                columns: new[] { "PendingOperation", "NextAttemptAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "google_calendar_local_event_syncs",
                schema: "core");

            migrationBuilder.DropIndex(
                name: "IX_google_calendar_connections_household_outbound_target",
                schema: "core",
                table: "google_calendar_connections");

            migrationBuilder.DropColumn(
                name: "OutboundSyncEnabled",
                schema: "core",
                table: "google_calendar_connections");

            migrationBuilder.CreateIndex(
                name: "IX_google_calendar_connections_HouseholdId",
                schema: "core",
                table: "google_calendar_connections",
                column: "HouseholdId");
        }
    }
}
