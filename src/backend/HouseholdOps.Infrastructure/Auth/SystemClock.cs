using HouseholdOps.SharedKernel.Time;

namespace HouseholdOps.Infrastructure.Auth;

public sealed class SystemClock : IClock
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}

