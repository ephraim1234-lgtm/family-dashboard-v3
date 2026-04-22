using System;
using HouseholdOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace HouseholdOps.Infrastructure.Persistence.Migrations;

[DbContext(typeof(HouseholdOpsDbContext))]
[Migration("20260422153000_AddAccountHouseholdMembershipFoundation")]
public partial class AddAccountHouseholdMembershipFoundation : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<Guid>(
            name: "CreatedByUserId",
            schema: "core",
            table: "households",
            type: "uuid",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "NormalizedEmail",
            schema: "core",
            table: "users",
            type: "character varying(320)",
            maxLength: 320,
            nullable: false,
            defaultValue: string.Empty);

        migrationBuilder.AddColumn<string>(
            name: "PasswordHash",
            schema: "core",
            table: "users",
            type: "text",
            nullable: false,
            defaultValue: string.Empty);

        migrationBuilder.Sql("""
            UPDATE core.users
            SET "NormalizedEmail" = UPPER("Email")
            WHERE COALESCE("NormalizedEmail", '') = '';
            """);

        migrationBuilder.DropForeignKey(
            name: "FK_sessions_households_ActiveHouseholdId",
            schema: "core",
            table: "sessions");

        migrationBuilder.AlterColumn<Guid>(
            name: "ActiveHouseholdId",
            schema: "core",
            table: "sessions",
            type: "uuid",
            nullable: true,
            oldClrType: typeof(Guid),
            oldType: "uuid");

        migrationBuilder.CreateTable(
            name: "household_invites",
            schema: "core",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                NormalizedEmail = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                Role = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                TokenHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                InvitedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                ExpiresAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                AcceptedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_household_invites", x => x.Id);
                table.ForeignKey(
                    name: "FK_household_invites_households_HouseholdId",
                    column: x => x.HouseholdId,
                    principalSchema: "core",
                    principalTable: "households",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_household_invites_users_InvitedByUserId",
                    column: x => x.InvitedByUserId,
                    principalSchema: "core",
                    principalTable: "users",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_households_CreatedByUserId",
            schema: "core",
            table: "households",
            column: "CreatedByUserId");

        migrationBuilder.CreateIndex(
            name: "IX_users_NormalizedEmail",
            schema: "core",
            table: "users",
            column: "NormalizedEmail",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_household_invites_household_email",
            schema: "core",
            table: "household_invites",
            columns: new[] { "HouseholdId", "NormalizedEmail" });

        migrationBuilder.CreateIndex(
            name: "IX_household_invites_InvitedByUserId",
            schema: "core",
            table: "household_invites",
            column: "InvitedByUserId");

        migrationBuilder.CreateIndex(
            name: "IX_household_invites_TokenHash",
            schema: "core",
            table: "household_invites",
            column: "TokenHash",
            unique: true);

        migrationBuilder.AddForeignKey(
            name: "FK_households_users_CreatedByUserId",
            schema: "core",
            table: "households",
            column: "CreatedByUserId",
            principalSchema: "core",
            principalTable: "users",
            principalColumn: "Id",
            onDelete: ReferentialAction.SetNull);

        migrationBuilder.AddForeignKey(
            name: "FK_sessions_households_ActiveHouseholdId",
            schema: "core",
            table: "sessions",
            column: "ActiveHouseholdId",
            principalSchema: "core",
            principalTable: "households",
            principalColumn: "Id",
            onDelete: ReferentialAction.SetNull);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(
            name: "FK_households_users_CreatedByUserId",
            schema: "core",
            table: "households");

        migrationBuilder.DropForeignKey(
            name: "FK_sessions_households_ActiveHouseholdId",
            schema: "core",
            table: "sessions");

        migrationBuilder.DropTable(
            name: "household_invites",
            schema: "core");

        migrationBuilder.DropIndex(
            name: "IX_households_CreatedByUserId",
            schema: "core",
            table: "households");

        migrationBuilder.DropIndex(
            name: "IX_users_NormalizedEmail",
            schema: "core",
            table: "users");

        migrationBuilder.DropColumn(
            name: "CreatedByUserId",
            schema: "core",
            table: "households");

        migrationBuilder.DropColumn(
            name: "NormalizedEmail",
            schema: "core",
            table: "users");

        migrationBuilder.DropColumn(
            name: "PasswordHash",
            schema: "core",
            table: "users");

        migrationBuilder.Sql("""
            DELETE FROM core.sessions
            WHERE "ActiveHouseholdId" IS NULL;
            """);

        migrationBuilder.AlterColumn<Guid>(
            name: "ActiveHouseholdId",
            schema: "core",
            table: "sessions",
            type: "uuid",
            nullable: false,
            oldClrType: typeof(Guid),
            oldType: "uuid",
            oldNullable: true);

        migrationBuilder.AddForeignKey(
            name: "FK_sessions_households_ActiveHouseholdId",
            schema: "core",
            table: "sessions",
            column: "ActiveHouseholdId",
            principalSchema: "core",
            principalTable: "households",
            principalColumn: "Id",
            onDelete: ReferentialAction.Cascade);
    }
}
