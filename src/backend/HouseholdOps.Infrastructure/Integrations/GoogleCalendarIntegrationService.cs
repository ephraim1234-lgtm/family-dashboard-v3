using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Modules.Integrations;
using HouseholdOps.Modules.Integrations.Contracts;
using HouseholdOps.Modules.Scheduling;
using Microsoft.EntityFrameworkCore;

namespace HouseholdOps.Infrastructure.Integrations;

public sealed class GoogleCalendarIntegrationService(
    HouseholdOpsDbContext dbContext,
    IGoogleCalendarFeedFetcher feedFetcher,
    IImportedScheduledEventSyncService importedEventSyncService) : IGoogleCalendarIntegrationService
{
    private const int DefaultSyncIntervalMinutes = 30;
    private readonly GoogleCalendarIcsParser parser = new();

    public async Task<GoogleCalendarLinkListResponse> ListAsync(
        Guid householdId,
        CancellationToken cancellationToken)
    {
        var items = await dbContext.GoogleCalendarConnections
            .Where(link => link.HouseholdId == householdId)
            .OrderByDescending(link => link.CreatedAtUtc)
            .Select(link => MapSummary(link))
            .ToListAsync(cancellationToken);

        return new GoogleCalendarLinkListResponse(items);
    }

    public async Task<GoogleCalendarLinkMutationResult> CreateAsync(
        Guid householdId,
        CreateGoogleCalendarLinkRequest request,
        DateTimeOffset createdAtUtc,
        CancellationToken cancellationToken)
    {
        var displayName = request.DisplayName?.Trim();
        if (string.IsNullOrWhiteSpace(displayName))
        {
            return GoogleCalendarLinkMutationResult.ValidationFailure(
                "Display name is required.");
        }

        if (!Uri.TryCreate(request.FeedUrl, UriKind.Absolute, out var feedUri)
            || (feedUri.Scheme != Uri.UriSchemeHttps && feedUri.Scheme != Uri.UriSchemeHttp))
        {
            return GoogleCalendarLinkMutationResult.ValidationFailure(
                "A valid Google Calendar iCal feed URL is required.");
        }

        if (!string.Equals(feedUri.Host, "calendar.google.com", StringComparison.OrdinalIgnoreCase))
        {
            return GoogleCalendarLinkMutationResult.ValidationFailure(
                "This slice currently supports Google Calendar iCal feeds from calendar.google.com only.");
        }

        var normalizedFeedUrl = feedUri.GetLeftPart(UriPartial.Path);
        var existingLink = await dbContext.GoogleCalendarConnections
            .AnyAsync(
                link => link.HouseholdId == householdId
                    && link.FeedUrl == normalizedFeedUrl,
                cancellationToken);

        if (existingLink)
        {
            return GoogleCalendarLinkMutationResult.Duplicate(
                "This Google Calendar feed is already linked for the current household.");
        }

        var link = new GoogleCalendarConnection
        {
            HouseholdId = householdId,
            DisplayName = displayName,
            FeedUrl = normalizedFeedUrl,
            CreatedAtUtc = createdAtUtc,
            AutoSyncEnabled = true,
            SyncIntervalMinutes = DefaultSyncIntervalMinutes,
            NextSyncDueAtUtc = createdAtUtc
        };

        dbContext.GoogleCalendarConnections.Add(link);
        await dbContext.SaveChangesAsync(cancellationToken);

        return GoogleCalendarLinkMutationResult.Success(MapSummary(link));
    }

    public async Task<bool> DeleteAsync(
        Guid householdId,
        Guid linkId,
        CancellationToken cancellationToken)
    {
        var link = await dbContext.GoogleCalendarConnections
            .SingleOrDefaultAsync(
                item => item.HouseholdId == householdId && item.Id == linkId,
                cancellationToken);

        if (link is null)
        {
            return false;
        }

        await importedEventSyncService.DeleteSourceAsync(
            householdId,
            EventSourceKinds.GoogleCalendarIcs,
            link.Id,
            cancellationToken);

        dbContext.GoogleCalendarConnections.Remove(link);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<GoogleCalendarLinkMutationResult> UpdateSyncSettingsAsync(
        Guid householdId,
        Guid linkId,
        UpdateGoogleCalendarLinkSyncSettingsRequest request,
        DateTimeOffset requestedAtUtc,
        CancellationToken cancellationToken)
    {
        var link = await dbContext.GoogleCalendarConnections
            .SingleOrDefaultAsync(
                item => item.HouseholdId == householdId && item.Id == linkId,
                cancellationToken);

        if (link is null)
        {
            return GoogleCalendarLinkMutationResult.ValidationFailure(
                "The linked Google Calendar was not found.");
        }

        if (request.SyncIntervalMinutes is < 5 or > 1440)
        {
            return GoogleCalendarLinkMutationResult.ValidationFailure(
                "Sync interval must be between 5 and 1440 minutes.");
        }

        link.AutoSyncEnabled = request.AutoSyncEnabled;
        link.SyncIntervalMinutes = request.SyncIntervalMinutes;
        link.NextSyncDueAtUtc = request.AutoSyncEnabled
            ? requestedAtUtc
            : null;

        await dbContext.SaveChangesAsync(cancellationToken);
        return GoogleCalendarLinkMutationResult.Success(MapSummary(link));
    }

    public async Task<GoogleCalendarSyncResult> SyncAsync(
        Guid householdId,
        Guid linkId,
        DateTimeOffset requestedAtUtc,
        CancellationToken cancellationToken)
    {
        var link = await dbContext.GoogleCalendarConnections
            .SingleOrDefaultAsync(
                item => item.HouseholdId == householdId && item.Id == linkId,
                cancellationToken);

        if (link is null)
        {
            return GoogleCalendarSyncResult.NotFound();
        }

        return await SyncLinkAsync(link, requestedAtUtc, cancellationToken);
    }

    public async Task<GoogleCalendarAutoSyncRunResult> SyncDueLinksAsync(
        DateTimeOffset requestedAtUtc,
        CancellationToken cancellationToken)
    {
        var dueLinks = await dbContext.GoogleCalendarConnections
            .Where(link =>
                link.AutoSyncEnabled
                && link.NextSyncDueAtUtc.HasValue
                && link.NextSyncDueAtUtc <= requestedAtUtc)
            .OrderBy(link => link.NextSyncDueAtUtc)
            .ToListAsync(cancellationToken);

        var succeededCount = 0;
        var failedCount = 0;

        foreach (var link in dueLinks)
        {
            var result = await SyncLinkAsync(link, requestedAtUtc, cancellationToken);
            if (result.Status == GoogleCalendarSyncResultStatus.Succeeded)
            {
                succeededCount++;
            }
            else
            {
                failedCount++;
            }
        }

        return new GoogleCalendarAutoSyncRunResult(
            dueLinks.Count,
            succeededCount,
            failedCount);
    }

    private async Task<GoogleCalendarSyncResult> SyncLinkAsync(
        GoogleCalendarConnection link,
        DateTimeOffset requestedAtUtc,
        CancellationToken cancellationToken)
    {
        link.LastSyncStartedAtUtc = requestedAtUtc;
        link.LastSyncError = null;
        await dbContext.SaveChangesAsync(cancellationToken);

        try
        {
            var feed = await feedFetcher.FetchAsync(link.FeedUrl, cancellationToken);
            var parsed = parser.Parse(feed);
            if (!parsed.IsValidFeed)
            {
                throw new InvalidOperationException(parsed.Error);
            }

            var syncResult = await importedEventSyncService.SyncAsync(
                link.HouseholdId,
                EventSourceKinds.GoogleCalendarIcs,
                link.Id,
                parsed.Events,
                requestedAtUtc,
                cancellationToken);

            link.LastSyncStatus = GoogleCalendarSyncStatuses.Succeeded;
            link.LastSyncCompletedAtUtc = requestedAtUtc;
            link.ImportedEventCount = syncResult.ActiveCount;
            link.SkippedRecurringEventCount = parsed.SkippedRecurringEventCount;
            link.NextSyncDueAtUtc = link.AutoSyncEnabled
                ? requestedAtUtc.AddMinutes(link.SyncIntervalMinutes)
                : null;
            await dbContext.SaveChangesAsync(cancellationToken);

            return GoogleCalendarSyncResult.Success(MapSummary(link));
        }
        catch (Exception exception)
        {
            link.LastSyncStatus = GoogleCalendarSyncStatuses.Failed;
            link.LastSyncCompletedAtUtc = requestedAtUtc;
            link.LastSyncError = exception.Message;
            link.NextSyncDueAtUtc = link.AutoSyncEnabled
                ? requestedAtUtc.AddMinutes(link.SyncIntervalMinutes)
                : null;
            await dbContext.SaveChangesAsync(cancellationToken);

            return GoogleCalendarSyncResult.Failed(
                exception.Message,
                MapSummary(link));
        }
    }

    private static GoogleCalendarLinkSummaryResponse MapSummary(
        GoogleCalendarConnection link)
    {
        var uri = new Uri(link.FeedUrl, UriKind.Absolute);
        var pathHint = uri.AbsolutePath.Length <= 24
            ? uri.AbsolutePath
            : $"...{uri.AbsolutePath[^24..]}";

        return new GoogleCalendarLinkSummaryResponse(
            link.Id,
            link.DisplayName,
            uri.Host,
            pathHint,
            link.AutoSyncEnabled,
            link.SyncIntervalMinutes,
            link.NextSyncDueAtUtc,
            link.LastSyncStatus,
            link.LastSyncError,
            link.LastSyncStartedAtUtc,
            link.LastSyncCompletedAtUtc,
            link.ImportedEventCount,
            link.SkippedRecurringEventCount,
            link.CreatedAtUtc);
    }
}
