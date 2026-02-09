namespace CubingOverlays.Models;

public class Statistics
{
    public double? PersonalBestAverage { get; set; }
    public double? PersonalBestSingle { get; set; }
    public double? PreviousRoundAverage { get; set; }
    public int? PreviousRoundRanking { get; set; }
    public double? Average { get; set; }
    public int? CurrentRank { get; set; }
    public double? BestPossibleAverage { get; set; }
    public int? BestPossibleRank { get; set; }
    public double? WorstPossibleAverage { get; set; }
    public int? WorstPossibleRank { get; set; }
    public double? NeededForFirst { get; set; }
    public double? NeededForPodium { get; set; }
}
