using System;
using HouseholdOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace HouseholdOps.Infrastructure.Persistence.Migrations;

[DbContext(typeof(HouseholdOpsDbContext))]
[Migration("202604110001_InitialAuthHouseholdBaseline")]
public partial class InitialAuthHouseholdBaseline : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.EnsureSchema(
            name: "core");

        migrationBuilder.CreateTable(
            name: "households",
            schema: "core",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_households", x => x.Id);
            });

        migrationBuilder.CreateTable(
            name: "users",
            schema: "core",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                DisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_users", x => x.Id);
            });

        migrationBuilder.CreateTable(
            name: "memberships",
            schema: "core",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                UserId = table.Column<Guid>(type: "uuid", nullable: false),
                Role = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_memberships", x => x.Id);
                table.ForeignKey(
                    name: "FK_memberships_households_HouseholdId",
                    column: x => x.HouseholdId,
                    principalSchema: "core",
                    principalTable: "households",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_memberships_users_UserId",
                    column: x => x.UserId,
                    principalSchema: "core",
                    principalTable: "users",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "sessions",
            schema: "core",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                UserId = table.Column<Guid>(type: "uuid", nullable: false),
                ActiveHouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                ExpiresAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                RevokedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                LastSeenAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_sessions", x => x.Id);
                table.ForeignKey(
                    name: "FK_sessions_households_ActiveHouseholdId",
                    column: x => x.ActiveHouseholdId,
                    principalSchema: "core",
                    principalTable: "households",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_sessions_users_UserId",
                    column: x => x.UserId,
                    principalSchema: "core",
                    principalTable: "users",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_memberships_HouseholdId_UserId",
            schema: "core",
            table: "memberships",
            columns: new[] { "HouseholdId", "UserId" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_memberships_UserId",
            schema: "core",
            table: "memberships",
            column: "UserId");

        migrationBuilder.CreateIndex(
            name: "IX_sessions_ActiveHouseholdId",
            schema: "core",
            table: "sessions",
            column: "ActiveHouseholdId");

        migrationBuilder.CreateIndex(
            name: "IX_sessions_UserId",
            schema: "core",
            table: "sessions",
            column: "UserId");

        migrationBuilder.CreateIndex(
            name: "IX_users_Email",
            schema: "core",
            table: "users",
            column: "Email",
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "memberships",
            schema: "core");

        migrationBuilder.DropTable(
            name: "sessions",
            schema: "core");

        migrationBuilder.DropTable(
            name: "households",
            schema: "core");

        migrationBuilder.DropTable(
            name: "users",
            schema: "core");
    }
}
