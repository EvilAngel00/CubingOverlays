namespace CubingOverlays.Models;

public class Settings
{
    public EventRankingSettings EventRanking { get; set; } = new();
    // Add other categories here later, e.g., public HeadToHeadSettings HeadToHead { get; set; }
}

public class EventRankingSettings
{
    public int PageDuration { get; set; } = 8;
    public int PageSize { get; set; } = 20;
}
