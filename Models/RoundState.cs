namespace CubingLayout.Models;

public class RoundState
{
    public string Event { get; set; } = "3x3";
    public string RoundName { get; set; } = "Final";
    public string? LeftCompetitorWcaId { get; set; }
    public string? RightCompetitorWcaId { get; set; }

    public List<string> LeftGroupWcaIds { get; set; } = [];
    public List<string> RightGroupWcaIds { get; set; } = [];
}
