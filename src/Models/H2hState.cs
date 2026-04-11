namespace CubingOverlays.Models;

public class H2hStateHolder
{
    public H2hState State { get; } = new();
}

public class H2hState
{
    public List<Competitor> Competitors { get; set; } = [];
    public string? LeftCompetitorWcaId { get; set; }
    public string? RightCompetitorWcaId { get; set; }
    public List<string> LeftGroupWcaIds { get; set; } = [];
    public List<string> RightGroupWcaIds { get; set; } = [];
}
