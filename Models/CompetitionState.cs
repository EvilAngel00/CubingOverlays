namespace CubingLayout.Models;

public class CompetitionState
{
    public List<Competitor> Competitors { get; set; } = [];
    public RoundState Round { get; set; } = new();
}
