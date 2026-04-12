using System;
using HouseholdOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace HouseholdOps.Infrastructure.Persistence.Migrations;

[DbContext(typeof(HouseholdOpsDbContext))]
[Migration("202604120004_AddEventReminders")]
public partial class AddEventReminders : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "event_reminders",
            schema: "core",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                ScheduledEventId = table.Column<Guid>(type: "uuid", nullable: false),
                EventTitle = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                MinutesBefore = table.Column<int>(type: "integer", nullable: false),
                DueAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                FiredAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_event_reminders", x => x.Id);
                table.ForeignKey(
                    name: "FK_event_reminders_households_HouseholdId",
                    column: x => x.HouseholdId,
                    principalSchema: "core",
                    principalTable: "households",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_event_reminders_HouseholdId",
            schema: "core",
            table: "event_reminders",
            column: "HouseholdId");

        migrationBuilder.CreateIndex(
            name: "IX_event_reminders_household_event",
            schema: "core",
            table: "event_reminders",
            columns: new[] { "HouseholdId", "ScheduledEventId" });

        migrationBuilder.CreateIndex(
            name: "IX_event_reminders_status_due",
            schema: "core",
            table: "event_reminders",
            columns: new[] { "Status", "DueAtUtc" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "event_reminders",
            schema: "core");
    }
}
