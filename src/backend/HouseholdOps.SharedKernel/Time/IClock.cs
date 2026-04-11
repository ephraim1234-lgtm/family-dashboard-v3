namespace HouseholdOps.SharedKernel.Time;

public interface IClock
{
    DateTimeOffset UtcNow { get; }
}

