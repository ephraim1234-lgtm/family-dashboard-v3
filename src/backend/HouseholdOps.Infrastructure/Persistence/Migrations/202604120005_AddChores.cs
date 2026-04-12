using System;
using HouseholdOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace HouseholdOps.Infrastructure.Persistence.Migrations;

[DbContext(typeof(HouseholdOpsDbContext))]
[Migration("202604120005_AddChores")]
public partial class AddChores : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "chores",
            schema: "core",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                Description = table.Column<string>(type: "text", nullable: true),
                AssignedMembershipId = table.Column<Guid>(type: "uuid", nullable: true),
                AssignedMemberName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                RecurrenceKind = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                WeeklyDaysMask = table.Column<int>(type: "integer", nullable: false),
                IsActive = table.Column<bool>(type: "boolean", nullable: false),
                CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_chores", x => x.Id);
                table.ForeignKey(
                    name: "FK_chores_households_HouseholdId",
                    column: x => x.HouseholdId,
                    principalSchema: "core",
                    principalTable: "households",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_chores_HouseholdId",
            schema: "core",
            table: "chores",
            column: "HouseholdId");

        migrationBuilder.CreateTable(
            name: "chore_completions",
            schema: "core",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                ChoreId = table.Column<Guid>(type: "uuid", nullable: false),
                ChoreTitle = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                CompletedByMembershipId = table.Column<Guid>(type: "uuid", nullable: true),
                CompletedByDisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                CompletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                Notes = table.Column<string>(type: "text", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_chore_completions", x => x.Id);
                table.ForeignKey(
                    name: "FK_chore_completions_households_HouseholdId",
                    column: x => x.HouseholdId,
                    principalSchema: "core",
                    principalTable: "households",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_chore_completions_HouseholdId",
            schema: "core",
            table: "chore_completions",
            column: "HouseholdId");

        migrationBuilder.CreateIndex(
            name: "IX_chore_completions_household_chore",
            schema: "core",
            table: "chore_completions",
            columns: new[] { "HouseholdId", "ChoreId" });

        migrationBuilder.CreateIndex(
            name: "IX_chore_completions_household_completed",
            schema: "core",
            table: "chore_completions",
            columns: new[] { "HouseholdId", "CompletedAtUtc" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "chore_completions", schema: "core");
        migrationBuilder.DropTable(name: "chores", schema: "core");
    }
}
