using System;
using HouseholdOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace HouseholdOps.Infrastructure.Persistence.Migrations;

[DbContext(typeof(HouseholdOpsDbContext))]
[Migration("202604110002_AddDisplayDevicesBaseline")]
public partial class AddDisplayDevicesBaseline : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "display_devices",
            schema: "core",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                IsActive = table.Column<bool>(type: "boolean", nullable: false),
                CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_display_devices", x => x.Id);
                table.ForeignKey(
                    name: "FK_display_devices_households_HouseholdId",
                    column: x => x.HouseholdId,
                    principalSchema: "core",
                    principalTable: "households",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "display_access_tokens",
            schema: "core",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                DisplayDeviceId = table.Column<Guid>(type: "uuid", nullable: false),
                TokenHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                TokenHint = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                RevokedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_display_access_tokens", x => x.Id);
                table.ForeignKey(
                    name: "FK_display_access_tokens_display_devices_DisplayDeviceId",
                    column: x => x.DisplayDeviceId,
                    principalSchema: "core",
                    principalTable: "display_devices",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_display_access_tokens_DisplayDeviceId",
            schema: "core",
            table: "display_access_tokens",
            column: "DisplayDeviceId");

        migrationBuilder.CreateIndex(
            name: "IX_display_access_tokens_TokenHash",
            schema: "core",
            table: "display_access_tokens",
            column: "TokenHash",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_display_devices_HouseholdId",
            schema: "core",
            table: "display_devices",
            column: "HouseholdId");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "display_access_tokens",
            schema: "core");

        migrationBuilder.DropTable(
            name: "display_devices",
            schema: "core");
    }
}
