namespace CubingOverlays.Models;

public class Settings
{
    public EventRankingSettings EventRanking { get; set; } = new();
    public HeadToHeadSettings HeadToHead { get; set; } = new();

    public EventDisplaySettings EventDisplay { get; set; } = new(); // New Category
}

public class EventRankingSettings
{
    public int PageDuration { get; set; } = 8;
    public int PageSize { get; set; } = 20;
}

public class HeadToHeadSettings
{
    public string LeftPlayerColor { get; set; } = "#000000"; // Black
    public string RightPlayerColor { get; set; } = "#000000"; // Black
}

public class EventDisplaySettings
{
    public string PrimaryColor { get; set; } = "#000000"; // Black
    public string SecondaryColor { get; set; } = "#000000"; // Black
    public string TertiaryColor { get; set; } = "#000000"; // Black
}