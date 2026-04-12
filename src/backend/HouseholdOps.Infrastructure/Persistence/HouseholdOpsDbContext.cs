using HouseholdOps.Modules.Chores;
using HouseholdOps.Modules.Display;
using HouseholdOps.Modules.Notes;
using HouseholdOps.Modules.Households;
using HouseholdOps.Modules.Identity;
using HouseholdOps.Modules.Integrations;
using HouseholdOps.Modules.Notifications;
using HouseholdOps.Modules.Scheduling;
using Microsoft.EntityFrameworkCore;

namespace HouseholdOps.Infrastructure.Persistence;

public sealed class HouseholdOpsDbContext(DbContextOptions<HouseholdOpsDbContext> options)
    : DbContext(options)
{
    public DbSet<Household> Households => Set<Household>();

    public DbSet<Membership> Memberships => Set<Membership>();

    public DbSet<User> Users => Set<User>();

    public DbSet<Session> Sessions => Set<Session>();

    public DbSet<DisplayDevice> DisplayDevices => Set<DisplayDevice>();

    public DbSet<DisplayAccessToken> DisplayAccessTokens => Set<DisplayAccessToken>();

    public DbSet<ScheduledEvent> ScheduledEvents => Set<ScheduledEvent>();

    public DbSet<GoogleCalendarConnection> GoogleCalendarConnections => Set<GoogleCalendarConnection>();

    public DbSet<GoogleOAuthAccountLink> GoogleOAuthAccountLinks => Set<GoogleOAuthAccountLink>();

    public DbSet<EventReminder> EventReminders => Set<EventReminder>();

    public DbSet<Chore> Chores => Set<Chore>();

    public DbSet<ChoreCompletion> ChoreCompletions => Set<ChoreCompletion>();

    public DbSet<Note> Notes => Set<Note>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.HasDefaultSchema("core");

        modelBuilder.Entity<Household>(entity =>
        {
            entity.ToTable("households");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(200);
            entity.Property(x => x.CreatedAtUtc);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Email).HasMaxLength(320);
            entity.Property(x => x.DisplayName).HasMaxLength(200);
            entity.Property(x => x.CreatedAtUtc);
            entity.HasIndex(x => x.Email).IsUnique();
        });

        modelBuilder.Entity<Membership>(entity =>
        {
            entity.ToTable("memberships");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Role).HasConversion<string>().HasMaxLength(32);
            entity.Property(x => x.CreatedAtUtc);
            entity.HasIndex(x => new { x.HouseholdId, x.UserId }).IsUnique();
            entity.HasOne<Household>()
                .WithMany()
                .HasForeignKey(x => x.HouseholdId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Session>(entity =>
        {
            entity.ToTable("sessions");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.CreatedAtUtc);
            entity.Property(x => x.ExpiresAtUtc);
            entity.Property(x => x.LastSeenAtUtc);
            entity.HasIndex(x => x.UserId);
            entity.HasIndex(x => x.ActiveHouseholdId);
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<Household>()
                .WithMany()
                .HasForeignKey(x => x.ActiveHouseholdId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<DisplayDevice>(entity =>
        {
            entity.ToTable("display_devices");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(200);
            entity.Property(x => x.PresentationMode)
                .HasConversion<string>()
                .HasMaxLength(32);
            entity.Property(x => x.AgendaDensityMode)
                .HasConversion<string>()
                .HasMaxLength(32);
            entity.Property(x => x.CreatedAtUtc);
            entity.HasIndex(x => x.HouseholdId);
            entity.HasOne<Household>()
                .WithMany()
                .HasForeignKey(x => x.HouseholdId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<DisplayAccessToken>(entity =>
        {
            entity.ToTable("display_access_tokens");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.TokenHash).HasMaxLength(128);
            entity.Property(x => x.TokenHint).HasMaxLength(16);
            entity.Property(x => x.CreatedAtUtc);
            entity.HasIndex(x => x.DisplayDeviceId);
            entity.HasIndex(x => x.TokenHash).IsUnique();
            entity.HasOne<DisplayDevice>()
                .WithMany()
                .HasForeignKey(x => x.DisplayDeviceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ScheduledEvent>(entity =>
        {
            entity.ToTable("scheduled_events");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Title).HasMaxLength(200);
            entity.Property(x => x.Description);
            entity.Property(x => x.RecurrencePattern).HasConversion<string>().HasMaxLength(16);
            entity.Property(x => x.WeeklyDaysMask);
            entity.Property(x => x.RecursUntilUtc);
            entity.Property(x => x.SourceKind).HasMaxLength(32);
            entity.Property(x => x.SourceEventId).HasMaxLength(256);
            entity.Property(x => x.SourceCalendarId);
            entity.Property(x => x.LastImportedAtUtc);
            entity.Property(x => x.CreatedAtUtc);
            entity.HasIndex(x => x.HouseholdId);
            entity.HasIndex(x => new { x.HouseholdId, x.SourceKind, x.SourceCalendarId, x.SourceEventId })
                .IsUnique()
                .HasDatabaseName("IX_scheduled_events_source_identity")
                .HasFilter("\"SourceKind\" IS NOT NULL AND \"SourceCalendarId\" IS NOT NULL AND \"SourceEventId\" IS NOT NULL");
            entity.HasOne<Household>()
                .WithMany()
                .HasForeignKey(x => x.HouseholdId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<GoogleCalendarConnection>(entity =>
        {
            entity.ToTable("google_calendar_connections");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.DisplayName).HasMaxLength(200);
            entity.Property(x => x.LinkMode).HasMaxLength(32);
            entity.Property(x => x.FeedUrl);
            entity.Property(x => x.GoogleOAuthAccountLinkId);
            entity.Property(x => x.GoogleCalendarId).HasMaxLength(320);
            entity.Property(x => x.GoogleCalendarTimeZone).HasMaxLength(128);
            entity.Property(x => x.AutoSyncEnabled);
            entity.Property(x => x.SyncIntervalMinutes);
            entity.Property(x => x.NextSyncDueAtUtc);
            entity.Property(x => x.LastSyncStatus).HasMaxLength(32);
            entity.Property(x => x.LastSyncError);
            entity.Property(x => x.CreatedAtUtc);
            entity.Property(x => x.LastSyncStartedAtUtc);
            entity.Property(x => x.LastSyncCompletedAtUtc);
            entity.Property(x => x.ImportedEventCount);
            entity.Property(x => x.SkippedRecurringEventCount);
            entity.Property(x => x.SkippedRecurringOverrideCount);
            entity.HasIndex(x => x.HouseholdId);
            entity.HasIndex(x => new { x.HouseholdId, x.FeedUrl })
                .IsUnique()
                .HasDatabaseName("IX_google_calendar_connections_household_feed_url")
                .HasFilter("\"FeedUrl\" IS NOT NULL");
            entity.HasIndex(x => new { x.HouseholdId, x.GoogleOAuthAccountLinkId, x.GoogleCalendarId })
                .IsUnique()
                .HasDatabaseName("IX_google_calendar_connections_household_oauth_calendar")
                .HasFilter("\"GoogleOAuthAccountLinkId\" IS NOT NULL AND \"GoogleCalendarId\" IS NOT NULL");
            entity.HasOne<Household>()
                .WithMany()
                .HasForeignKey(x => x.HouseholdId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<GoogleOAuthAccountLink>()
                .WithMany()
                .HasForeignKey(x => x.GoogleOAuthAccountLinkId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<GoogleOAuthAccountLink>(entity =>
        {
            entity.ToTable("google_oauth_account_links");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.GoogleUserId).HasMaxLength(128);
            entity.Property(x => x.Email).HasMaxLength(320);
            entity.Property(x => x.DisplayName).HasMaxLength(200);
            entity.Property(x => x.AccessToken);
            entity.Property(x => x.RefreshToken);
            entity.Property(x => x.TokenType).HasMaxLength(32);
            entity.Property(x => x.Scope);
            entity.Property(x => x.AccessTokenExpiresAtUtc);
            entity.Property(x => x.CreatedAtUtc);
            entity.Property(x => x.UpdatedAtUtc);
            entity.HasIndex(x => x.HouseholdId);
            entity.HasIndex(x => new { x.HouseholdId, x.GoogleUserId }).IsUnique();
            entity.HasOne<Household>()
                .WithMany()
                .HasForeignKey(x => x.HouseholdId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<EventReminder>(entity =>
        {
            entity.ToTable("event_reminders");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.EventTitle).HasMaxLength(200);
            entity.Property(x => x.MinutesBefore);
            entity.Property(x => x.DueAtUtc);
            entity.Property(x => x.Status).HasMaxLength(16);
            entity.Property(x => x.FiredAtUtc);
            entity.Property(x => x.CreatedAtUtc);
            entity.HasIndex(x => x.HouseholdId);
            entity.HasIndex(x => new { x.HouseholdId, x.ScheduledEventId })
                .HasDatabaseName("IX_event_reminders_household_event");
            entity.HasIndex(x => new { x.Status, x.DueAtUtc })
                .HasDatabaseName("IX_event_reminders_status_due");
            entity.HasOne<Household>()
                .WithMany()
                .HasForeignKey(x => x.HouseholdId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Chore>(entity =>
        {
            entity.ToTable("chores");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Title).HasMaxLength(200);
            entity.Property(x => x.Description);
            entity.Property(x => x.AssignedMemberName).HasMaxLength(200);
            entity.Property(x => x.RecurrenceKind).HasConversion<string>().HasMaxLength(16);
            entity.Property(x => x.WeeklyDaysMask);
            entity.Property(x => x.IsActive);
            entity.Property(x => x.CreatedAtUtc);
            entity.HasIndex(x => x.HouseholdId);
            entity.HasOne<Household>()
                .WithMany()
                .HasForeignKey(x => x.HouseholdId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ChoreCompletion>(entity =>
        {
            entity.ToTable("chore_completions");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.ChoreTitle).HasMaxLength(200);
            entity.Property(x => x.CompletedByDisplayName).HasMaxLength(200);
            entity.Property(x => x.CompletedAtUtc);
            entity.Property(x => x.Notes);
            entity.HasIndex(x => x.HouseholdId);
            entity.HasIndex(x => new { x.HouseholdId, x.ChoreId })
                .HasDatabaseName("IX_chore_completions_household_chore");
            entity.HasIndex(x => new { x.HouseholdId, x.CompletedAtUtc })
                .HasDatabaseName("IX_chore_completions_household_completed");
            entity.HasOne<Household>()
                .WithMany()
                .HasForeignKey(x => x.HouseholdId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Note>(entity =>
        {
            entity.ToTable("notes");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Title).HasMaxLength(200);
            entity.Property(x => x.Body);
            entity.Property(x => x.AuthorDisplayName).HasMaxLength(200);
            entity.Property(x => x.IsPinned);
            entity.Property(x => x.CreatedAtUtc);
            entity.HasIndex(x => x.HouseholdId);
            entity.HasIndex(x => new { x.HouseholdId, x.IsPinned })
                .HasDatabaseName("IX_notes_household_pinned");
            entity.HasOne<Household>()
                .WithMany()
                .HasForeignKey(x => x.HouseholdId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
