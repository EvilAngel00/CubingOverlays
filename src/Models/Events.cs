namespace CubingOverlays.Models;

public class EventDisplayState
{
    public DisplaySelection Primary { get; set; } = new();
    public DisplaySelection Secondary { get; set; } = new();
    public DisplaySelection Tertiary { get; set; } = new();
}

public class DisplaySelection
{
    public string Event { get; set; } = string.Empty;
    public string Round { get; set; } = string.Empty;
}