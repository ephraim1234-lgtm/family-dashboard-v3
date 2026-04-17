using System;
using HouseholdOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace HouseholdOps.Infrastructure.Persistence.Migrations;

[DbContext(typeof(HouseholdOpsDbContext))]
[Migration("202604160001_AddChores")]
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
                AssignedToMemberId = table.Column<Guid>(type: "uuid", nullable: true),
                AssignedToDisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                CadenceKind = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                WeeklyDaysMask = table.Column<int>(type: "integer", nullable: false),
                DayOfMonth = table.Column<int>(type: "integer", nullable: true),
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

        migrationBuilder.CreateTable(
            name: "chore_instances",
            schema: "core",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                ChoreId = table.Column<Guid>(type: "uuid", nullable: false),
                ChoreTitle = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                AssignedToMemberId = table.Column<Guid>(type: "uuid", nullable: true),
                AssignedToDisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                DueDate = table.Column<DateOnly>(type: "date", nullable: false),
                Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                CompletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                CompletedByMemberId = table.Column<Guid>(type: "uuid", nullable: true),
                CompletedByDisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_chore_instances", x => x.Id);
                table.ForeignKey(
                    name: "FK_chore_instances_households_HouseholdId",
                    column: x => x.HouseholdId,
                    principalSchema: "core",
                    principalTable: "households",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_chore_instances_chores_ChoreId",
                    column: x => x.ChoreId,
                    principalSchema: "core",
                    principalTable: "chores",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_chores_HouseholdId",
            schema: "core",
            table: "chores",
            column: "HouseholdId");

        migrationBuilder.CreateIndex(
            name: "IX_chore_instances_HouseholdId",
            schema: "core",
            table: "chore_instances",
            column: "HouseholdId");

        migrationBuilder.CreateIndex(
            name: "IX_chore_instances_ChoreId_DueDate",
            schema: "core",
            table: "chore_instances",
            columns: new[] { "ChoreId", "DueDate" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_chore_instances_HouseholdId_DueDate",
            schema: "core",
            table: "chore_instances",
            columns: new[] { "HouseholdId", "DueDate" });

        migrationBuilder.CreateIndex(
            name: "IX_chore_instances_Status",
            schema: "core",
            table: "chore_instances",
            column: "Status");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "chore_instances", schema: "core");
        migrationBuilder.DropTable(name: "chores", schema: "core");
    }
}
