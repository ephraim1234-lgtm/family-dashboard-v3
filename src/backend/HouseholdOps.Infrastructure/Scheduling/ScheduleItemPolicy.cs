using HouseholdOps.Modules.Notifications;
using HouseholdOps.Modules.Scheduling;

namespace HouseholdOps.Infrastructure.Scheduling;

internal sealed record ScheduleItemCapabilities(
    bool IsReadOnly,
    bool CanEdit,
    bool CanDelete,
    bool CanCreateReminder,
    bool CanManageReminders,
    string? ReminderEligibilityReason);

internal sealed record ReminderActionCapabilities(
    bool IsReadOnly,
    bool CanDismiss,
    bool CanSnooze,
    bool CanDelete);

internal static class ScheduleItemPolicy
{
    internal const string ReminderMissingEventReason =
        "The scheduled event no longer exists.";

    internal const string ReminderImportedEventReason =
        "Imported calendar events are read-only and cannot have local reminders.";

    internal const string ReminderAllDayReason =
        "All-day events cannot have reminders in this slice.";

    internal const string ReminderMissingStartReason =
        "Reminders require an event with a specific start time.";

    internal const string ReminderRecurringReason =
        "Recurring events cannot have reminders in this cleanup pass.";

    internal const string ReminderOwnerOnlyReason =
        "Only household owners can manage reminders.";

    internal const string ReminderDismissedReadOnlyReason =
        "Dismissed reminders can only be deleted.";

    internal const string ReminderFiredReadOnlyReason =
        "Fired reminders are kept as read-only audit entries.";

    public static ScheduleItemCapabilities BuildEventCapabilities(
        ScheduledEvent scheduledEvent,
        bool isOwner)
    {
        var isImported = !string.IsNullOrWhiteSpace(scheduledEvent.SourceKind);
        var canEdit = isOwner && !isImported;
        var canDelete = canEdit;
        var reminderEligibilityReason = GetReminderEligibilityReason(scheduledEvent, isOwner);
        var canManageReminders = reminderEligibilityReason is null;

        return new ScheduleItemCapabilities(
            IsReadOnly: !canEdit,
            CanEdit: canEdit,
            CanDelete: canDelete,
            CanCreateReminder: canManageReminders,
            CanManageReminders: canManageReminders,
            ReminderEligibilityReason: reminderEligibilityReason);
    }

    public static ReminderActionCapabilities BuildReminderCapabilities(
        EventReminder reminder,
        bool isOwner)
    {
        if (!isOwner)
        {
            return new ReminderActionCapabilities(
                IsReadOnly: true,
                CanDismiss: false,
                CanSnooze: false,
                CanDelete: false);
        }

        return reminder.Status switch
        {
            EventReminderStatuses.Pending => new ReminderActionCapabilities(
                IsReadOnly: false,
                CanDismiss: true,
                CanSnooze: true,
                CanDelete: true),
            EventReminderStatuses.Dismissed => new ReminderActionCapabilities(
                IsReadOnly: false,
                CanDismiss: false,
                CanSnooze: false,
                CanDelete: true),
            _ => new ReminderActionCapabilities(
                IsReadOnly: true,
                CanDismiss: false,
                CanSnooze: false,
                CanDelete: false)
        };
    }

    public static bool SupportsReminderLifecycle(ScheduledEvent? scheduledEvent) =>
        GetReminderSupportReason(scheduledEvent) is null;

    public static string? GetReminderEligibilityReason(
        ScheduledEvent? scheduledEvent,
        bool isOwner)
    {
        var supportReason = GetReminderSupportReason(scheduledEvent);
        if (supportReason is not null)
        {
            return supportReason;
        }

        return isOwner ? null : ReminderOwnerOnlyReason;
    }

    public static string? GetReminderSupportReason(ScheduledEvent? scheduledEvent)
    {
        if (scheduledEvent is null)
        {
            return ReminderMissingEventReason;
        }

        if (!string.IsNullOrWhiteSpace(scheduledEvent.SourceKind))
        {
            return ReminderImportedEventReason;
        }

        if (scheduledEvent.IsAllDay)
        {
            return ReminderAllDayReason;
        }

        if (!scheduledEvent.StartsAtUtc.HasValue)
        {
            return ReminderMissingStartReason;
        }

        return scheduledEvent.RecurrencePattern != EventRecurrencePattern.None
            ? ReminderRecurringReason
            : null;
    }
}
