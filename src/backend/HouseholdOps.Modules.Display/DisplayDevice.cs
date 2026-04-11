namespace HouseholdOps.Modules.Display;

public sealed class DisplayDevice
{
    public Guid Id { get; init; } = Guid.NewGuid();

    public Guid HouseholdId { get; init; }

    public string Name { get; init; } = string.Empty;

    public bool IsActive { get; init; } = true;

    public DisplayPresentationMode PresentationMode { get; set; } =
        DisplayPresentationMode.Balanced;

    public DisplayAgendaDensityMode AgendaDensityMode { get; set; } =
        DisplayAgendaDensityMode.Comfortable;

    public DateTimeOffset CreatedAtUtc { get; init; }
}
