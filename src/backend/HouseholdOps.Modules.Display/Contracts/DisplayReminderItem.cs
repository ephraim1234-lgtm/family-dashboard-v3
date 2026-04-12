namespace HouseholdOps.Modules.Display.Contracts;

public sealed record DisplayReminderItem(
    string EventTitle,
    int MinutesBefore,
    DateTimeOffset DueAtUtc);
