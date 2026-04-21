using HouseholdOps.Modules.Chores;
using HouseholdOps.Modules.Display;
using HouseholdOps.Modules.Food;
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

    public DbSet<FoodIngredient> FoodIngredients => Set<FoodIngredient>();

    public DbSet<PantryLocation> PantryLocations => Set<PantryLocation>();

    public DbSet<PantryItem> PantryItems => Set<PantryItem>();

    public DbSet<RecipeSource> RecipeSources => Set<RecipeSource>();

    public DbSet<Recipe> Recipes => Set<Recipe>();

    public DbSet<RecipeRevision> RecipeRevisions => Set<RecipeRevision>();

    public DbSet<RecipeIngredient> RecipeIngredients => Set<RecipeIngredient>();

    public DbSet<RecipeStep> RecipeSteps => Set<RecipeStep>();

    public DbSet<RecipeImportJob> RecipeImportJobs => Set<RecipeImportJob>();

    public DbSet<MealPlanSlot> MealPlanSlots => Set<MealPlanSlot>();

    public DbSet<MealPlanRecipe> MealPlanRecipes => Set<MealPlanRecipe>();

    public DbSet<ShoppingList> ShoppingLists => Set<ShoppingList>();

    public DbSet<ShoppingListItem> ShoppingListItems => Set<ShoppingListItem>();

    public DbSet<CookingSession> CookingSessions => Set<CookingSession>();

    public DbSet<CookingSessionRecipe> CookingSessionRecipes => Set<CookingSessionRecipe>();

    public DbSet<CookingSessionIngredient> CookingSessionIngredients => Set<CookingSessionIngredient>();

    public DbSet<CookingSessionPantryAdjustment> CookingSessionPantryAdjustments => Set<CookingSessionPantryAdjustment>();

    public DbSet<CookingSessionStep> CookingSessionSteps => Set<CookingSessionStep>();

    public DbSet<PantryItemActivity> PantryItemActivities => Set<PantryItemActivity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.HasDefaultSchema("core");

        modelBuilder.Entity<Household>(entity =>
        {
            entity.ToTable("households");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(200);
            entity.Property(x => x.TimeZoneId)
                .HasMaxLength(100)
                .HasDefaultValue("UTC");
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

        modelBuilder.Entity<FoodIngredient>(entity =>
        {
            entity.ToTable("food_ingredients");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(200);
            entity.Property(x => x.NormalizedName).HasMaxLength(200);
            entity.Property(x => x.DefaultUnit).HasMaxLength(32);
            entity.Property(x => x.DefaultImageUrl);
            entity.Property(x => x.CreatedAtUtc);
            entity.HasIndex(x => x.HouseholdId);
            entity.HasIndex(x => new { x.HouseholdId, x.NormalizedName })
                .IsUnique()
                .HasDatabaseName("IX_food_ingredients_household_normalized_name");
            entity.HasOne<Household>()
                .WithMany()
                .HasForeignKey(x => x.HouseholdId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PantryLocation>(entity =>
        {
            entity.ToTable("pantry_locations");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(100);
            entity.Property(x => x.SortOrder);
            entity.Property(x => x.CreatedAtUtc);
            entity.HasIndex(x => x.HouseholdId);
            entity.HasIndex(x => new { x.HouseholdId, x.Name })
                .IsUnique()
                .HasDatabaseName("IX_pantry_locations_household_name");
            entity.HasOne<Household>()
                .WithMany()
                .HasForeignKey(x => x.HouseholdId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PantryItem>(entity =>
        {
            entity.ToTable("pantry_items");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.IngredientName).HasMaxLength(200);
            entity.Property(x => x.NormalizedIngredientName).HasMaxLength(200);
            entity.Property(x => x.Quantity).HasPrecision(18, 2);
            entity.Property(x => x.Unit).HasMaxLength(32);
            entity.Property(x => x.LowThreshold).HasPrecision(18, 2);
            entity.Property(x => x.Status).HasMaxLength(32);
            entity.Property(x => x.PurchasedAtUtc);
            entity.Property(x => x.ExpiresAtUtc);
            entity.Property(x => x.ImageUrlOverride);
            entity.Property(x => x.UpdatedAtUtc);
            entity.HasIndex(x => x.HouseholdId);
            entity.HasIndex(x => new { x.HouseholdId, x.NormalizedIngredientName })
                .HasDatabaseName("IX_pantry_items_household_ingredient");
            entity.HasOne<Household>()
                .WithMany()
                .HasForeignKey(x => x.HouseholdId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<FoodIngredient>()
                .WithMany()
                .HasForeignKey(x => x.IngredientId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne<PantryLocation>()
                .WithMany()
                .HasForeignKey(x => x.PantryLocationId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<RecipeSource>(entity =>
        {
            entity.ToTable("recipe_sources");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Kind).HasMaxLength(32);
            entity.Property(x => x.SourceUrl);
            entity.Property(x => x.SourceTitle).HasMaxLength(200);
            entity.Property(x => x.SourceSiteName).HasMaxLength(200);
            entity.Property(x => x.Attribution).HasMaxLength(200);
            entity.Property(x => x.CreatedAtUtc);
            entity.HasIndex(x => x.HouseholdId);
            entity.HasOne<Household>()
                .WithMany()
                .HasForeignKey(x => x.HouseholdId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Recipe>(entity =>
        {
            entity.ToTable("recipes");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Title).HasMaxLength(200);
            entity.Property(x => x.Summary);
            entity.Property(x => x.Tags).HasMaxLength(400);
            entity.Property(x => x.ImageUrl);
            entity.Property(x => x.CreatedAtUtc);
            entity.Property(x => x.UpdatedAtUtc);
            entity.HasIndex(x => x.HouseholdId);
            entity.HasOne<Household>()
                .WithMany()
                .HasForeignKey(x => x.HouseholdId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RecipeRevision>(entity =>
        {
            entity.ToTable("recipe_revisions");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Kind).HasMaxLength(32);
            entity.Property(x => x.Title).HasMaxLength(200);
            entity.Property(x => x.Summary);
            entity.Property(x => x.YieldText).HasMaxLength(100);
            entity.Property(x => x.Notes);
            entity.Property(x => x.Tags).HasMaxLength(400);
            entity.Property(x => x.CreatedAtUtc);
            entity.HasIndex(x => x.RecipeId);
            entity.HasIndex(x => new { x.RecipeId, x.RevisionNumber })
                .IsUnique()
                .HasDatabaseName("IX_recipe_revisions_recipe_number");
            entity.HasOne<Household>()
                .WithMany()
                .HasForeignKey(x => x.HouseholdId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RecipeIngredient>(entity =>
        {
            entity.ToTable("recipe_ingredients");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.IngredientName).HasMaxLength(200);
            entity.Property(x => x.NormalizedIngredientName).HasMaxLength(200);
            entity.Property(x => x.Quantity).HasPrecision(18, 2);
            entity.Property(x => x.Unit).HasMaxLength(32);
            entity.Property(x => x.Preparation).HasMaxLength(200);
            entity.HasIndex(x => x.RecipeRevisionId);
            entity.HasOne<RecipeRevision>()
                .WithMany()
                .HasForeignKey(x => x.RecipeRevisionId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<FoodIngredient>()
                .WithMany()
                .HasForeignKey(x => x.IngredientId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<RecipeStep>(entity =>
        {
            entity.ToTable("recipe_steps");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Instruction);
            entity.HasIndex(x => x.RecipeRevisionId);
            entity.HasOne<RecipeRevision>()
                .WithMany()
                .HasForeignKey(x => x.RecipeRevisionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RecipeImportJob>(entity =>
        {
            entity.ToTable("recipe_import_jobs");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.SourceUrl);
            entity.Property(x => x.Status).HasMaxLength(32);
            entity.Property(x => x.ParserConfidence).HasPrecision(5, 2);
            entity.Property(x => x.ImportedTitle).HasMaxLength(200);
            entity.Property(x => x.ImportedYieldText).HasMaxLength(100);
            entity.Property(x => x.ImportedSummary);
            entity.Property(x => x.SourceSiteName).HasMaxLength(200);
            entity.Property(x => x.FailureReason);
            entity.Property(x => x.RawPayloadJson);
            entity.Property(x => x.CreatedAtUtc);
            entity.Property(x => x.ParsedAtUtc);
            entity.Property(x => x.ConsumedAtUtc);
            entity.HasIndex(x => x.HouseholdId);
            entity.HasOne<Household>()
                .WithMany()
                .HasForeignKey(x => x.HouseholdId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MealPlanSlot>(entity =>
        {
            entity.ToTable("meal_plan_slots");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Date);
            entity.Property(x => x.SlotName).HasMaxLength(64);
            entity.Property(x => x.Title).HasMaxLength(200);
            entity.Property(x => x.RecipeTitleSnapshot).HasMaxLength(200);
            entity.Property(x => x.Notes);
            entity.Property(x => x.CreatedAtUtc);
            entity.HasIndex(x => x.HouseholdId);
            entity.HasIndex(x => new { x.HouseholdId, x.Date })
                .HasDatabaseName("IX_meal_plan_slots_household_date");
            entity.HasOne<Household>()
                .WithMany()
                .HasForeignKey(x => x.HouseholdId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MealPlanRecipe>(entity =>
        {
            entity.ToTable("meal_plan_recipes");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Role).HasMaxLength(32);
            entity.Property(x => x.RecipeTitleSnapshot).HasMaxLength(200);
            entity.Property(x => x.CreatedAtUtc);
            entity.HasIndex(x => x.MealPlanSlotId);
            entity.HasIndex(x => new { x.MealPlanSlotId, x.Position })
                .IsUnique()
                .HasDatabaseName("IX_meal_plan_recipes_slot_position");
            entity.HasOne<MealPlanSlot>()
                .WithMany()
                .HasForeignKey(x => x.MealPlanSlotId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<Recipe>()
                .WithMany()
                .HasForeignKey(x => x.RecipeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ShoppingList>(entity =>
        {
            entity.ToTable("shopping_lists");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(100);
            entity.Property(x => x.StoreName).HasMaxLength(100);
            entity.Property(x => x.Status).HasMaxLength(32);
            entity.Property(x => x.CreatedAtUtc);
            entity.Property(x => x.CompletedAtUtc);
            entity.Property(x => x.ArchivedAtUtc);
            entity.Property(x => x.CompletedByUserId);
            entity.Property(x => x.ItemsPurchasedCount);
            entity.HasIndex(x => x.HouseholdId);
            entity.HasIndex(x => new { x.HouseholdId, x.Status, x.CompletedAtUtc })
                .HasDatabaseName("IX_shopping_lists_household_status_completed");
            entity.HasIndex(x => x.HouseholdId)
                .HasDatabaseName("IX_shopping_lists_household_active_default")
                .IsUnique()
                .HasFilter("\"Status\" = 'Active' AND \"IsDefault\" = TRUE");
            entity.HasOne<Household>()
                .WithMany()
                .HasForeignKey(x => x.HouseholdId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ShoppingListItem>(entity =>
        {
            entity.ToTable("shopping_list_items");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.IngredientName).HasMaxLength(200);
            entity.Property(x => x.NormalizedIngredientName).HasMaxLength(200);
            entity.Property(x => x.CoreIngredientName).HasMaxLength(200);
            entity.Property(x => x.Preparation).HasMaxLength(64);
            entity.Property(x => x.Quantity).HasPrecision(18, 2);
            entity.Property(x => x.QuantityNeeded).HasPrecision(18, 2);
            entity.Property(x => x.QuantityPurchased).HasPrecision(18, 2);
            entity.Property(x => x.Unit).HasMaxLength(32);
            entity.Property(x => x.UnitCanonical).HasMaxLength(32);
            entity.Property(x => x.Notes);
            entity.Property(x => x.SourceRecipeTitle).HasMaxLength(200);
            entity.Property(x => x.SourceMealTitle).HasMaxLength(200);
            entity.Property(x => x.SourceRecipeIds).HasMaxLength(400);
            entity.Property(x => x.SourceMealTitles).HasMaxLength(400);
            entity.Property(x => x.SourceMealPlanSlotId);
            entity.Property(x => x.State).HasMaxLength(32);
            entity.Property(x => x.SortOrder);
            entity.Property(x => x.AisleCategory).HasMaxLength(32);
            entity.Property(x => x.ClaimedByUserId);
            entity.Property(x => x.ClaimedAtUtc);
            entity.Property(x => x.CreatedAtUtc);
            entity.Property(x => x.CompletedAtUtc);
            entity.HasIndex(x => x.HouseholdId);
            entity.HasIndex(x => x.ShoppingListId);
            entity.HasIndex(x => new { x.ShoppingListId, x.State })
                .HasDatabaseName("IX_shopping_list_items_list_state");
            entity.HasIndex(x => new { x.HouseholdId, x.CoreIngredientName })
                .HasDatabaseName("IX_shopping_list_items_household_core");
            entity.HasIndex(x => new { x.HouseholdId, x.ClaimedByUserId })
                .HasDatabaseName("IX_shopping_list_items_household_claimed")
                .HasFilter("\"ClaimedByUserId\" IS NOT NULL");
            entity.HasOne<Household>()
                .WithMany()
                .HasForeignKey(x => x.HouseholdId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<ShoppingList>()
                .WithMany()
                .HasForeignKey(x => x.ShoppingListId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<FoodIngredient>()
                .WithMany()
                .HasForeignKey(x => x.IngredientId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne<MealPlanSlot>()
                .WithMany()
                .HasForeignKey(x => x.SourceMealPlanSlotId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<CookingSession>(entity =>
        {
            entity.ToTable("cooking_sessions");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Title).HasMaxLength(200);
            entity.Property(x => x.Status).HasMaxLength(32);
            entity.Property(x => x.PantryUpdateMode).HasMaxLength(32);
            entity.Property(x => x.CurrentStepIndex);
            entity.Property(x => x.StartedAtUtc);
            entity.Property(x => x.UpdatedAtUtc);
            entity.Property(x => x.CompletedAtUtc);
            entity.HasIndex(x => x.HouseholdId);
            entity.HasIndex(x => x.RecipeId);
            entity.HasOne<Household>()
                .WithMany()
                .HasForeignKey(x => x.HouseholdId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<Recipe>()
                .WithMany()
                .HasForeignKey(x => x.RecipeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CookingSessionRecipe>(entity =>
        {
            entity.ToTable("cooking_session_recipes");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Role).HasMaxLength(32);
            entity.Property(x => x.Title).HasMaxLength(200);
            entity.HasIndex(x => x.CookingSessionId);
            entity.HasIndex(x => new { x.CookingSessionId, x.Position })
                .IsUnique()
                .HasDatabaseName("IX_cooking_session_recipes_session_position");
            entity.HasOne<CookingSession>()
                .WithMany()
                .HasForeignKey(x => x.CookingSessionId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<Recipe>()
                .WithMany()
                .HasForeignKey(x => x.RecipeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CookingSessionIngredient>(entity =>
        {
            entity.ToTable("cooking_session_ingredients");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.IngredientName).HasMaxLength(200);
            entity.Property(x => x.NormalizedIngredientName).HasMaxLength(200);
            entity.Property(x => x.PlannedQuantity).HasPrecision(18, 2);
            entity.Property(x => x.PlannedUnit).HasMaxLength(32);
            entity.Property(x => x.ActualQuantity).HasPrecision(18, 2);
            entity.Property(x => x.ActualUnit).HasMaxLength(32);
            entity.Property(x => x.Notes);
            entity.Property(x => x.PantryDeductedQuantity).HasPrecision(18, 2);
            entity.Property(x => x.PantryDeductionStatus).HasMaxLength(32);
            entity.HasIndex(x => x.CookingSessionId);
            entity.HasOne<CookingSession>()
                .WithMany()
                .HasForeignKey(x => x.CookingSessionId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<CookingSessionRecipe>()
                .WithMany()
                .HasForeignKey(x => x.CookingSessionRecipeId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<CookingSessionPantryAdjustment>(entity =>
        {
            entity.ToTable("cooking_session_pantry_adjustments");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.QuantityDelta).HasPrecision(18, 2);
            entity.Property(x => x.Unit).HasMaxLength(32);
            entity.Property(x => x.AppliedAtUtc);
            entity.HasIndex(x => x.CookingSessionIngredientId);
            entity.HasOne<CookingSessionIngredient>()
                .WithMany()
                .HasForeignKey(x => x.CookingSessionIngredientId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<PantryItem>()
                .WithMany()
                .HasForeignKey(x => x.PantryItemId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CookingSessionStep>(entity =>
        {
            entity.ToTable("cooking_session_steps");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Instruction);
            entity.Property(x => x.Notes);
            entity.HasIndex(x => x.CookingSessionId);
            entity.HasOne<CookingSession>()
                .WithMany()
                .HasForeignKey(x => x.CookingSessionId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<CookingSessionRecipe>()
                .WithMany()
                .HasForeignKey(x => x.CookingSessionRecipeId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<PantryItemActivity>(entity =>
        {
            entity.ToTable("pantry_item_activities");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Kind).HasMaxLength(32);
            entity.Property(x => x.QuantityDelta).HasPrecision(18, 2);
            entity.Property(x => x.QuantityAfter).HasPrecision(18, 2);
            entity.Property(x => x.Unit).HasMaxLength(32);
            entity.Property(x => x.Note);
            entity.Property(x => x.SourceLabel).HasMaxLength(200);
            entity.Property(x => x.OccurredAtUtc);
            entity.HasIndex(x => x.HouseholdId);
            entity.HasIndex(x => new { x.PantryItemId, x.OccurredAtUtc })
                .HasDatabaseName("IX_pantry_item_activities_item_occurred");
            entity.HasOne<Household>()
                .WithMany()
                .HasForeignKey(x => x.HouseholdId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<PantryItem>()
                .WithMany()
                .HasForeignKey(x => x.PantryItemId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
