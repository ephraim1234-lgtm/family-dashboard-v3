using System;
using HouseholdOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace HouseholdOps.Infrastructure.Persistence.Migrations;

[DbContext(typeof(HouseholdOpsDbContext))]
[Migration("202604120001_AddGoogleOAuthAccountLinks")]
public partial class AddGoogleOAuthAccountLinks : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "google_oauth_account_links",
            schema: "core",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                LinkedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                GoogleUserId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                DisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                AccessToken = table.Column<string>(type: "text", nullable: false),
                RefreshToken = table.Column<string>(type: "text", nullable: true),
                TokenType = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                Scope = table.Column<string>(type: "text", nullable: false),
                AccessTokenExpiresAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_google_oauth_account_links", x => x.Id);
                table.ForeignKey(
                    name: "FK_google_oauth_account_links_households_HouseholdId",
                    column: x => x.HouseholdId,
                    principalSchema: "core",
                    principalTable: "households",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_google_oauth_account_links_HouseholdId",
            schema: "core",
            table: "google_oauth_account_links",
            column: "HouseholdId");

        migrationBuilder.CreateIndex(
            name: "IX_google_oauth_account_links_HouseholdId_GoogleUserId",
            schema: "core",
            table: "google_oauth_account_links",
            columns: new[] { "HouseholdId", "GoogleUserId" },
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "google_oauth_account_links",
            schema: "core");
    }
}
