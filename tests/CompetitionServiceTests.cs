using CubingOverlays.Models;
using CubingOverlays.Services;

    namespace CubingOverlaysTests;

public class CompetitionServiceTests
{
    // Helper method to create test competitors with specific stats
    private static Competitor CreateCompetitor(string wcaId, string name, double?[] solveTimes, string? dnfPenalty = null)
    {
        var competitor = new Competitor(wcaId, name, "CH");
        
        for (int i = 0; i < solveTimes.Length && i < 5; i++)
        {
            var penalty = solveTimes[i].HasValue ? "none" : "dnf";
            competitor.Solves[i] = new Solve(i + 1, solveTimes[i]!.Value, penalty);
        }
        
        return competitor;
    }

    // Helper method to setup competitors with calculated stats
    private static List<Competitor> SetupCompetitorsWithStats()
    {
        var competitors = new List<Competitor>
        {
            // Competitor in 1st place with solid average
            CreateCompetitor("2023SMIT01", "John Smith", [10.5, 11.2, 10.8, 11.0, 10.6]),
            
            // Competitor in 2nd place 
            CreateCompetitor("2023JONE02", "Jane Jones", [11.5, 12.1, 11.8, 12.0, 11.7]),
            
            // Competitor in 3rd place (podium)
            CreateCompetitor("2023BROW03", "Bob Brown", [12.2, 13.0, 12.5, 12.8, 12.3]),
            
            // Competitor in 4th place
            CreateCompetitor("2023GREE04", "Green Gary", [13.0, 13.8, 13.2, 13.5, 13.1]),
            
            // Test competitor with 4 solves (needs 5th solve)
            CreateCompetitor("2023TEST05", "Test User", [7.34, 12.0, 11.5, 12.5]),
        };

        // Calculate stats for all competitors
        var state = new CompetitionState { Competitors = competitors };
        CompetitionService.UpdateCompetitorStats(state);

        return competitors;
    }

    [Fact]
    public void Test_CalculateNeededForThird_WithFourSolves_ReturnsNegativeOne()
    {
        // Arrange
        var competitors = SetupCompetitorsWithStats();
        var testCompetitor = competitors.First(c => c.WcaId == "2023TEST05");

        // Act
        var neededForThird = CompetitionService.CalculateNeededForRank(testCompetitor, competitors, 3);

        // Assert
        Assert.NotNull(neededForThird);

        // I can be 3rd with any time
        Assert.True(neededForThird == -1);
    }

    [Fact]
    public void Test_CalculateNeededForFirst_WithFourSolves_ReturnsValidNumber()
    {
        // Arrange
        var competitors = SetupCompetitorsWithStats();
        var testCompetitor = competitors.First(c => c.WcaId == "2023TEST05");

        // Act
        var neededForFirst = CompetitionService.CalculateNeededForRank(testCompetitor, competitors, 1);

        // Assert
        Assert.NotNull(neededForFirst);
        Assert.True(neededForFirst == 8.91);
    }

    [Fact]
    public void Test_CalculateNeededForRank_TargetRankBeyondCompetitors_ReturnsNegativeOne()
    {
        // Arrange
        var competitors = SetupCompetitorsWithStats();
        var testCompetitor = competitors.First(c => c.WcaId == "2023TEST05");

        // Act - Request rank higher than any competitor (unreachable)
        var result = CompetitionService.CalculateNeededForRank(testCompetitor, competitors, 100);

        // Assert
        Assert.Equal(-1, result);
    }

    [Fact]
    public void Test_CalculateNeededForRank_WithLessThanFourSolves_ReturnsNull()
    {
        // Arrange
        var competitor = CreateCompetitor("2023TEST06", "Incomplete", [11.0, 12.0, 11.5]);
        var competitors = new List<Competitor> { competitor };

        // Act
        var result = CompetitionService.CalculateNeededForRank(competitor, competitors, 1);

        // Assert
        Assert.Null(result);
    }
}
