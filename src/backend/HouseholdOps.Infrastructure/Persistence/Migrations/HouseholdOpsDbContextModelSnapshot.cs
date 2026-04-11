using System;
using HouseholdOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

namespace HouseholdOps.Infrastructure.Persistence.Migrations;

[DbContext(typeof(HouseholdOpsDbContext))]
partial class HouseholdOpsDbContextModelSnapshot : ModelSnapshot
{
    protected override void BuildModel(ModelBuilder modelBuilder)
    {
#pragma warning disable 612, 618
        modelBuilder
            .HasDefaultSchema("core")
            .HasAnnotation("ProductVersion", "9.0.7")
            .HasAnnotation("Relational:MaxIdentifierLength", 63);

        NpgsqlModelBuilderExtensions.UseIdentityByDefaultColumns(modelBuilder);

        modelBuilder.Entity("HouseholdOps.Modules.Display.DisplayAccessToken", b =>
            {
                b.Property<Guid>("Id")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("uuid");

                b.Property<DateTimeOffset>("CreatedAtUtc")
                    .HasColumnType("timestamp with time zone");

                b.Property<Guid>("DisplayDeviceId")
                    .HasColumnType("uuid");

                b.Property<DateTimeOffset?>("RevokedAtUtc")
                    .HasColumnType("timestamp with time zone");

                b.Property<string>("TokenHash")
                    .IsRequired()
                    .HasMaxLength(128)
                    .HasColumnType("character varying(128)");

                b.Property<string>("TokenHint")
                    .IsRequired()
                    .HasMaxLength(16)
                    .HasColumnType("character varying(16)");

                b.HasKey("Id");

                b.HasIndex("DisplayDeviceId");

                b.HasIndex("TokenHash")
                    .IsUnique();

                b.ToTable("display_access_tokens", "core");
            });

        modelBuilder.Entity("HouseholdOps.Modules.Display.DisplayDevice", b =>
            {
                b.Property<Guid>("Id")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("uuid");

                b.Property<DateTimeOffset>("CreatedAtUtc")
                    .HasColumnType("timestamp with time zone");

                b.Property<Guid>("HouseholdId")
                    .HasColumnType("uuid");

                b.Property<bool>("IsActive")
                    .HasColumnType("boolean");

                b.Property<string>("Name")
                    .IsRequired()
                    .HasMaxLength(200)
                    .HasColumnType("character varying(200)");

                b.HasKey("Id");

                b.HasIndex("HouseholdId");

                b.ToTable("display_devices", "core");
            });

        modelBuilder.Entity("HouseholdOps.Modules.Households.Household", b =>
            {
                b.Property<Guid>("Id")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("uuid");

                b.Property<DateTimeOffset>("CreatedAtUtc")
                    .HasColumnType("timestamp with time zone");

                b.Property<string>("Name")
                    .IsRequired()
                    .HasMaxLength(200)
                    .HasColumnType("character varying(200)");

                b.HasKey("Id");

                b.ToTable("households", "core");
            });

        modelBuilder.Entity("HouseholdOps.Modules.Households.Membership", b =>
            {
                b.Property<Guid>("Id")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("uuid");

                b.Property<DateTimeOffset>("CreatedAtUtc")
                    .HasColumnType("timestamp with time zone");

                b.Property<Guid>("HouseholdId")
                    .HasColumnType("uuid");

                b.Property<string>("Role")
                    .IsRequired()
                    .HasMaxLength(32)
                    .HasColumnType("character varying(32)");

                b.Property<Guid>("UserId")
                    .HasColumnType("uuid");

                b.HasKey("Id");

                b.HasIndex("HouseholdId", "UserId")
                    .IsUnique();

                b.HasIndex("UserId");

                b.ToTable("memberships", "core");
            });

        modelBuilder.Entity("HouseholdOps.Modules.Identity.Session", b =>
            {
                b.Property<Guid>("Id")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("uuid");

                b.Property<Guid>("ActiveHouseholdId")
                    .HasColumnType("uuid");

                b.Property<DateTimeOffset>("CreatedAtUtc")
                    .HasColumnType("timestamp with time zone");

                b.Property<DateTimeOffset>("ExpiresAtUtc")
                    .HasColumnType("timestamp with time zone");

                b.Property<DateTimeOffset>("LastSeenAtUtc")
                    .HasColumnType("timestamp with time zone");

                b.Property<DateTimeOffset?>("RevokedAtUtc")
                    .HasColumnType("timestamp with time zone");

                b.Property<Guid>("UserId")
                    .HasColumnType("uuid");

                b.HasKey("Id");

                b.HasIndex("ActiveHouseholdId");

                b.HasIndex("UserId");

                b.ToTable("sessions", "core");
            });

        modelBuilder.Entity("HouseholdOps.Modules.Identity.User", b =>
            {
                b.Property<Guid>("Id")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("uuid");

                b.Property<DateTimeOffset>("CreatedAtUtc")
                    .HasColumnType("timestamp with time zone");

                b.Property<string>("DisplayName")
                    .IsRequired()
                    .HasMaxLength(200)
                    .HasColumnType("character varying(200)");

                b.Property<string>("Email")
                    .IsRequired()
                    .HasMaxLength(320)
                    .HasColumnType("character varying(320)");

                b.HasKey("Id");

                b.HasIndex("Email")
                    .IsUnique();

                b.ToTable("users", "core");
            });

        modelBuilder.Entity("HouseholdOps.Modules.Display.DisplayAccessToken", b =>
            {
                b.HasOne("HouseholdOps.Modules.Display.DisplayDevice", null)
                    .WithMany()
                    .HasForeignKey("DisplayDeviceId")
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();
            });

        modelBuilder.Entity("HouseholdOps.Modules.Display.DisplayDevice", b =>
            {
                b.HasOne("HouseholdOps.Modules.Households.Household", null)
                    .WithMany()
                    .HasForeignKey("HouseholdId")
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();
            });

        modelBuilder.Entity("HouseholdOps.Modules.Households.Membership", b =>
            {
                b.HasOne("HouseholdOps.Modules.Households.Household", null)
                    .WithMany()
                    .HasForeignKey("HouseholdId")
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();

                b.HasOne("HouseholdOps.Modules.Identity.User", null)
                    .WithMany()
                    .HasForeignKey("UserId")
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();
            });

        modelBuilder.Entity("HouseholdOps.Modules.Identity.Session", b =>
            {
                b.HasOne("HouseholdOps.Modules.Households.Household", null)
                    .WithMany()
                    .HasForeignKey("ActiveHouseholdId")
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();

                b.HasOne("HouseholdOps.Modules.Identity.User", null)
                    .WithMany()
                    .HasForeignKey("UserId")
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();
            });
#pragma warning restore 612, 618
    }
}
