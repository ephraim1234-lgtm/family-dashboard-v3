using System;
using HouseholdOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
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

        modelBuilder.Entity("HouseholdOps.Modules.Chores.Chore", b =>
            {
                b.Property<Guid>("Id")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("uuid");

                b.Property<Guid?>("AssignedMembershipId")
                    .HasColumnType("uuid");

                b.Property<string?>("AssignedMemberName")
                    .HasMaxLength(200)
                    .HasColumnType("character varying(200)");

                b.Property<DateTimeOffset>("CreatedAtUtc")
                    .HasColumnType("timestamp with time zone");

                b.Property<string?>("Description")
                    .HasColumnType("text");

                b.Property<Guid>("HouseholdId")
                    .HasColumnType("uuid");

                b.Property<bool>("IsActive")
                    .HasColumnType("boolean");

                b.Property<string>("RecurrenceKind")
                    .IsRequired()
                    .HasMaxLength(16)
                    .HasColumnType("character varying(16)");

                b.Property<string>("Title")
                    .IsRequired()
                    .HasMaxLength(200)
                    .HasColumnType("character varying(200)");

                b.Property<int>("WeeklyDaysMask")
                    .HasColumnType("integer");

                b.HasKey("Id");

                b.HasIndex("HouseholdId");

                b.ToTable("chores", "core");
            });

        modelBuilder.Entity("HouseholdOps.Modules.Chores.ChoreCompletion", b =>
            {
                b.Property<Guid>("Id")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("uuid");

                b.Property<Guid>("ChoreId")
                    .HasColumnType("uuid");

                b.Property<string>("ChoreTitle")
                    .IsRequired()
                    .HasMaxLength(200)
                    .HasColumnType("character varying(200)");

                b.Property<DateTimeOffset>("CompletedAtUtc")
                    .HasColumnType("timestamp with time zone");

                b.Property<string>("CompletedByDisplayName")
                    .IsRequired()
                    .HasMaxLength(200)
                    .HasColumnType("character varying(200)");

                b.Property<Guid?>("CompletedByMembershipId")
                    .HasColumnType("uuid");

                b.Property<Guid>("HouseholdId")
                    .HasColumnType("uuid");

                b.Property<string?>("Notes")
                    .HasColumnType("text");

                b.HasKey("Id");

                b.HasIndex("HouseholdId");

                b.HasIndex("HouseholdId", "ChoreId")
                    .HasDatabaseName("IX_chore_completions_household_chore");

                b.HasIndex("HouseholdId", "CompletedAtUtc")
                    .HasDatabaseName("IX_chore_completions_household_completed");

                b.ToTable("chore_completions", "core");
            });

        modelBuilder.Entity("HouseholdOps.Modules.Notes.Note", b =>
            {
                b.Property<Guid>("Id")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("uuid");

                b.Property<Guid?>("AuthorMembershipId")
                    .HasColumnType("uuid");

                b.Property<string>("AuthorDisplayName")
                    .IsRequired()
                    .HasMaxLength(200)
                    .HasColumnType("character varying(200)");

                b.Property<string?>("Body")
                    .HasColumnType("text");

                b.Property<DateTimeOffset>("CreatedAtUtc")
                    .HasColumnType("timestamp with time zone");

                b.Property<Guid>("HouseholdId")
                    .HasColumnType("uuid");

                b.Property<bool>("IsPinned")
                    .HasColumnType("boolean");

                b.Property<string>("Title")
                    .IsRequired()
                    .HasMaxLength(200)
                    .HasColumnType("character varying(200)");

                b.HasKey("Id");

                b.HasIndex("HouseholdId");

                b.HasIndex("HouseholdId", "IsPinned")
                    .HasDatabaseName("IX_notes_household_pinned");

                b.ToTable("notes", "core");
            });

        modelBuilder.Entity("HouseholdOps.Modules.Notifications.EventReminder", b =>
            {
                b.Property<Guid>("Id")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("uuid");

                b.Property<DateTimeOffset>("CreatedAtUtc")
                    .HasColumnType("timestamp with time zone");

                b.Property<DateTimeOffset>("DueAtUtc")
                    .HasColumnType("timestamp with time zone");

                b.Property<string>("EventTitle")
                    .IsRequired()
                    .HasMaxLength(200)
                    .HasColumnType("character varying(200)");

                b.Property<DateTimeOffset?>("FiredAtUtc")
                    .HasColumnType("timestamp with time zone");

                b.Property<Guid>("HouseholdId")
                    .HasColumnType("uuid");

                b.Property<int>("MinutesBefore")
                    .HasColumnType("integer");

                b.Property<Guid>("ScheduledEventId")
                    .HasColumnType("uuid");

                b.Property<string>("Status")
                    .IsRequired()
                    .HasMaxLength(16)
                    .HasColumnType("character varying(16)");

                b.HasKey("Id");

                b.HasIndex("HouseholdId");

                b.HasIndex("HouseholdId", "ScheduledEventId")
                    .HasDatabaseName("IX_event_reminders_household_event");

                b.HasIndex("Status", "DueAtUtc")
                    .HasDatabaseName("IX_event_reminders_status_due");

                b.ToTable("event_reminders", "core");
            });

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

                b.Property<string>("AgendaDensityMode")
                    .IsRequired()
                    .HasMaxLength(32)
                    .HasColumnType("character varying(32)");

                b.Property<string>("Name")
                    .IsRequired()
                    .HasMaxLength(200)
                    .HasColumnType("character varying(200)");

                b.Property<string>("PresentationMode")
                    .IsRequired()
                    .HasMaxLength(32)
                    .HasColumnType("character varying(32)");

                b.HasKey("Id");

                b.HasIndex("HouseholdId");

                b.ToTable("display_devices", "core");
            });

        modelBuilder.Entity("HouseholdOps.Modules.Integrations.GoogleCalendarConnection", b =>
            {
                b.Property<Guid>("Id")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("uuid");

                b.Property<bool>("AutoSyncEnabled")
                    .HasColumnType("boolean");

                b.Property<DateTimeOffset>("CreatedAtUtc")
                    .HasColumnType("timestamp with time zone");

                b.Property<string>("DisplayName")
                    .IsRequired()
                    .HasMaxLength(200)
                    .HasColumnType("character varying(200)");

                b.Property<string>("FeedUrl")
                    .HasColumnType("text");

                b.Property<string>("GoogleCalendarId")
                    .HasMaxLength(320)
                    .HasColumnType("character varying(320)");

                b.Property<string>("GoogleCalendarTimeZone")
                    .HasMaxLength(128)
                    .HasColumnType("character varying(128)");

                b.Property<Guid?>("GoogleOAuthAccountLinkId")
                    .HasColumnType("uuid");

                b.Property<Guid>("HouseholdId")
                    .HasColumnType("uuid");

                b.Property<int>("ImportedEventCount")
                    .HasColumnType("integer");

                b.Property<DateTimeOffset?>("NextSyncDueAtUtc")
                    .HasColumnType("timestamp with time zone");

                b.Property<DateTimeOffset?>("LastSyncCompletedAtUtc")
                    .HasColumnType("timestamp with time zone");

                b.Property<string>("LastSyncError")
                    .HasColumnType("text");

                b.Property<DateTimeOffset?>("LastSyncStartedAtUtc")
                    .HasColumnType("timestamp with time zone");

                b.Property<string>("LastSyncStatus")
                    .IsRequired()
                    .HasMaxLength(32)
                    .HasColumnType("character varying(32)");

                b.Property<int>("SkippedRecurringEventCount")
                    .HasColumnType("integer");

                b.Property<int>("SkippedRecurringOverrideCount")
                    .HasColumnType("integer");

                b.Property<int>("SyncIntervalMinutes")
                    .HasColumnType("integer");

                b.Property<string>("LinkMode")
                    .IsRequired()
                    .HasMaxLength(32)
                    .HasColumnType("character varying(32)");

                b.HasKey("Id");

                b.HasIndex("GoogleOAuthAccountLinkId");

                b.HasIndex("HouseholdId");

                b.HasIndex("HouseholdId", "FeedUrl")
                    .IsUnique()
                    .HasDatabaseName("IX_google_calendar_connections_household_feed_url")
                    .HasFilter("\"FeedUrl\" IS NOT NULL");

                b.HasIndex("HouseholdId", "GoogleOAuthAccountLinkId", "GoogleCalendarId")
                    .IsUnique()
                    .HasDatabaseName("IX_google_calendar_connections_household_oauth_calendar")
                    .HasFilter("\"GoogleOAuthAccountLinkId\" IS NOT NULL AND \"GoogleCalendarId\" IS NOT NULL");

                b.ToTable("google_calendar_connections", "core");
            });

        modelBuilder.Entity("HouseholdOps.Modules.Integrations.GoogleOAuthAccountLink", b =>
            {
                b.Property<Guid>("Id")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("uuid");

                b.Property<string>("AccessToken")
                    .IsRequired()
                    .HasColumnType("text");

                b.Property<DateTimeOffset?>("AccessTokenExpiresAtUtc")
                    .HasColumnType("timestamp with time zone");

                b.Property<DateTimeOffset>("CreatedAtUtc")
                    .HasColumnType("timestamp with time zone");

                b.Property<string>("DisplayName")
                    .HasMaxLength(200)
                    .HasColumnType("character varying(200)");

                b.Property<string>("Email")
                    .IsRequired()
                    .HasMaxLength(320)
                    .HasColumnType("character varying(320)");

                b.Property<string>("GoogleUserId")
                    .IsRequired()
                    .HasMaxLength(128)
                    .HasColumnType("character varying(128)");

                b.Property<Guid>("HouseholdId")
                    .HasColumnType("uuid");

                b.Property<Guid>("LinkedByUserId")
                    .HasColumnType("uuid");

                b.Property<string>("RefreshToken")
                    .HasColumnType("text");

                b.Property<string>("Scope")
                    .IsRequired()
                    .HasColumnType("text");

                b.Property<string>("TokenType")
                    .IsRequired()
                    .HasMaxLength(32)
                    .HasColumnType("character varying(32)");

                b.Property<DateTimeOffset>("UpdatedAtUtc")
                    .HasColumnType("timestamp with time zone");

                b.HasKey("Id");

                b.HasIndex("HouseholdId");

                b.HasIndex("HouseholdId", "GoogleUserId")
                    .IsUnique();

                b.ToTable("google_oauth_account_links", "core");
            });

        modelBuilder.Entity("HouseholdOps.Modules.Scheduling.ScheduledEvent", b =>
            {
                b.Property<Guid>("Id")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("uuid");

                b.Property<DateTimeOffset>("CreatedAtUtc")
                    .HasColumnType("timestamp with time zone");

                b.Property<string>("Description")
                    .HasColumnType("text");

                b.Property<DateTimeOffset?>("EndsAtUtc")
                    .HasColumnType("timestamp with time zone");

                b.Property<Guid>("HouseholdId")
                    .HasColumnType("uuid");

                b.Property<bool>("IsAllDay")
                    .HasColumnType("boolean");

                b.Property<DateTimeOffset?>("LastImportedAtUtc")
                    .HasColumnType("timestamp with time zone");

                b.Property<string>("RecurrencePattern")
                    .IsRequired()
                    .HasMaxLength(16)
                    .HasColumnType("character varying(16)");

                b.Property<DateTimeOffset?>("RecursUntilUtc")
                    .HasColumnType("timestamp with time zone");

                b.Property<DateTimeOffset?>("StartsAtUtc")
                    .HasColumnType("timestamp with time zone");

                b.Property<Guid?>("SourceCalendarId")
                    .HasColumnType("uuid");

                b.Property<string>("SourceEventId")
                    .HasMaxLength(256)
                    .HasColumnType("character varying(256)");

                b.Property<string>("SourceKind")
                    .HasMaxLength(32)
                    .HasColumnType("character varying(32)");

                b.Property<string>("Title")
                    .IsRequired()
                    .HasMaxLength(200)
                    .HasColumnType("character varying(200)");

                b.Property<int>("WeeklyDaysMask")
                    .HasColumnType("integer");

                b.HasKey("Id");

                b.HasIndex("HouseholdId");

                b.HasIndex("HouseholdId", "SourceKind", "SourceCalendarId", "SourceEventId")
                    .IsUnique()
                    .HasDatabaseName("IX_scheduled_events_source_identity")
                    .HasFilter("\"SourceKind\" IS NOT NULL AND \"SourceCalendarId\" IS NOT NULL AND \"SourceEventId\" IS NOT NULL");

                b.ToTable("scheduled_events", "core");
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

                b.Property<string>("TimeZoneId")
                    .IsRequired()
                    .ValueGeneratedOnAdd()
                    .HasMaxLength(100)
                    .HasColumnType("character varying(100)")
                    .HasDefaultValue("UTC");

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

        modelBuilder.Entity("HouseholdOps.Modules.Notifications.EventReminder", b =>
            {
                b.HasOne("HouseholdOps.Modules.Households.Household", null)
                    .WithMany()
                    .HasForeignKey("HouseholdId")
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();
            });

        modelBuilder.Entity("HouseholdOps.Modules.Display.DisplayAccessToken", b =>
            {
                b.HasOne("HouseholdOps.Modules.Display.DisplayDevice", null)
                    .WithMany()
                    .HasForeignKey("DisplayDeviceId")
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();
            });

        modelBuilder.Entity("HouseholdOps.Modules.Chores.Chore", b =>
            {
                b.HasOne("HouseholdOps.Modules.Households.Household", null)
                    .WithMany()
                    .HasForeignKey("HouseholdId")
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();
            });

        modelBuilder.Entity("HouseholdOps.Modules.Chores.ChoreCompletion", b =>
            {
                b.HasOne("HouseholdOps.Modules.Households.Household", null)
                    .WithMany()
                    .HasForeignKey("HouseholdId")
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();
            });

        modelBuilder.Entity("HouseholdOps.Modules.Notes.Note", b =>
            {
                b.HasOne("HouseholdOps.Modules.Households.Household", null)
                    .WithMany()
                    .HasForeignKey("HouseholdId")
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();
            });

        modelBuilder.Entity("HouseholdOps.Modules.Scheduling.ScheduledEvent", b =>
            {
                b.HasOne("HouseholdOps.Modules.Households.Household", null)
                    .WithMany()
                    .HasForeignKey("HouseholdId")
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();
            });

        modelBuilder.Entity("HouseholdOps.Modules.Integrations.GoogleCalendarConnection", b =>
            {
                b.HasOne("HouseholdOps.Modules.Integrations.GoogleOAuthAccountLink", null)
                    .WithMany()
                    .HasForeignKey("GoogleOAuthAccountLinkId")
                    .OnDelete(DeleteBehavior.Cascade);

                b.HasOne("HouseholdOps.Modules.Households.Household", null)
                    .WithMany()
                    .HasForeignKey("HouseholdId")
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();
            });

        modelBuilder.Entity("HouseholdOps.Modules.Integrations.GoogleOAuthAccountLink", b =>
            {
                b.HasOne("HouseholdOps.Modules.Households.Household", null)
                    .WithMany()
                    .HasForeignKey("HouseholdId")
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
