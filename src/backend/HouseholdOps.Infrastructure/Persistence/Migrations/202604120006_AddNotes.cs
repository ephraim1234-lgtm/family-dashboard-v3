using System;
using HouseholdOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace HouseholdOps.Infrastructure.Persistence.Migrations;

[DbContext(typeof(HouseholdOpsDbContext))]
[Migration("202604120006_AddNotes")]
public partial class AddNotes : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "notes",
            schema: "core",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                Body = table.Column<string>(type: "text", nullable: true),
                AuthorMembershipId = table.Column<Guid>(type: "uuid", nullable: true),
                AuthorDisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                IsPinned = table.Column<bool>(type: "boolean", nullable: false),
                CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_notes", x => x.Id);
                table.ForeignKey(
                    name: "FK_notes_households_HouseholdId",
                    column: x => x.HouseholdId,
                    principalSchema: "core",
                    principalTable: "households",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_notes_HouseholdId",
            schema: "core",
            table: "notes",
            column: "HouseholdId");

        migrationBuilder.CreateIndex(
            name: "IX_notes_household_pinned",
            schema: "core",
            table: "notes",
            columns: new[] { "HouseholdId", "IsPinned" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "notes", schema: "core");
    }
}
