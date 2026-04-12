using System;
using HouseholdOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace HouseholdOps.Infrastructure.Persistence.Migrations;

[DbContext(typeof(HouseholdOpsDbContext))]
[Migration("202604120002_AddManagedGoogleCalendarLinks")]
public partial class AddManagedGoogleCalendarLinks : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "GoogleCalendarId",
            schema: "core",
            table: "google_calendar_connections",
            type: "character varying(320)",
            maxLength: 320,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "GoogleCalendarTimeZone",
            schema: "core",
            table: "google_calendar_connections",
            type: "character varying(128)",
            maxLength: 128,
            nullable: true);

        migrationBuilder.AddColumn<Guid>(
            name: "GoogleOAuthAccountLinkId",
            schema: "core",
            table: "google_calendar_connections",
            type: "uuid",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "LinkMode",
            schema: "core",
            table: "google_calendar_connections",
            type: "character varying(32)",
            maxLength: 32,
            nullable: false,
            defaultValue: "IcsFeed");

        migrationBuilder.AlterColumn<string>(
            name: "FeedUrl",
            schema: "core",
            table: "google_calendar_connections",
            type: "text",
            nullable: true,
            oldClrType: typeof(string),
            oldType: "text");

        migrationBuilder.CreateIndex(
            name: "IX_google_calendar_connections_household_feed_url",
            schema: "core",
            table: "google_calendar_connections",
            columns: new[] { "HouseholdId", "FeedUrl" },
            unique: true,
            filter: "\"FeedUrl\" IS NOT NULL");

        migrationBuilder.CreateIndex(
            name: "IX_google_calendar_connections_household_oauth_calendar",
            schema: "core",
            table: "google_calendar_connections",
            columns: new[] { "HouseholdId", "GoogleOAuthAccountLinkId", "GoogleCalendarId" },
            unique: true,
            filter: "\"GoogleOAuthAccountLinkId\" IS NOT NULL AND \"GoogleCalendarId\" IS NOT NULL");

        migrationBuilder.CreateIndex(
            name: "IX_google_calendar_connections_GoogleOAuthAccountLinkId",
            schema: "core",
            table: "google_calendar_connections",
            column: "GoogleOAuthAccountLinkId");

        migrationBuilder.AddForeignKey(
            name: "FK_google_calendar_connections_google_oauth_account_links_GoogleOAuthAccountLinkId",
            schema: "core",
            table: "google_calendar_connections",
            column: "GoogleOAuthAccountLinkId",
            principalSchema: "core",
            principalTable: "google_oauth_account_links",
            principalColumn: "Id",
            onDelete: ReferentialAction.Cascade);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(
            name: "FK_google_calendar_connections_google_oauth_account_links_GoogleOAuthAccountLinkId",
            schema: "core",
            table: "google_calendar_connections");

        migrationBuilder.DropIndex(
            name: "IX_google_calendar_connections_GoogleOAuthAccountLinkId",
            schema: "core",
            table: "google_calendar_connections");

        migrationBuilder.DropIndex(
            name: "IX_google_calendar_connections_household_feed_url",
            schema: "core",
            table: "google_calendar_connections");

        migrationBuilder.DropIndex(
            name: "IX_google_calendar_connections_household_oauth_calendar",
            schema: "core",
            table: "google_calendar_connections");

        migrationBuilder.AlterColumn<string>(
            name: "FeedUrl",
            schema: "core",
            table: "google_calendar_connections",
            type: "text",
            nullable: false,
            defaultValue: "",
            oldClrType: typeof(string),
            oldType: "text",
            oldNullable: true);

        migrationBuilder.DropColumn(
            name: "GoogleCalendarId",
            schema: "core",
            table: "google_calendar_connections");

        migrationBuilder.DropColumn(
            name: "GoogleCalendarTimeZone",
            schema: "core",
            table: "google_calendar_connections");

        migrationBuilder.DropColumn(
            name: "GoogleOAuthAccountLinkId",
            schema: "core",
            table: "google_calendar_connections");

        migrationBuilder.DropColumn(
            name: "LinkMode",
            schema: "core",
            table: "google_calendar_connections");
    }
}
