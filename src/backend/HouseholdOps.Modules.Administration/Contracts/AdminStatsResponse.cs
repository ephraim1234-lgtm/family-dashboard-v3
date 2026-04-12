namespace HouseholdOps.Modules.Administration.Contracts;

public sealed record AdminStatsResponse(
    int MemberCount,
    int ActiveChoreCount,
    int EventsThisWeekCount,
    int ChoreCompletionsThisWeekCount,
    int NoteCount);
