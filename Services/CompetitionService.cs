using CubingOverlays.Models;
using System.Collections.Generic;

namespace CubingOverlays.Services;

public static class CompetitionService
{
    public static void UpdateCompetitorStats(CompetitionState state)
    {
        var activeIds = new[] { state.Round.LeftCompetitorWcaId, state.Round.RightCompetitorWcaId };

        foreach (var id in activeIds)
        {
            var comp = state.Competitors.FirstOrDefault(c => c.WcaId == id);
            if (comp == null) continue;

            comp.Stats.Average = CalculateAo5(comp.Solves);
            comp.Stats.CurrentRank = CalculateRank(
                comp.Stats.Average,
                comp.WcaId,
                state.Competitors);
            comp.Stats.BestPossibleAverage = CalculateBPA(comp.Solves);
            comp.Stats.WorstPossibleAverage = CalculateWPA(comp.Solves);
            comp.Stats.BestPossibleRank = CalculateProjectedBPARank(
                comp.Stats.BestPossibleAverage,
                comp.WcaId,
                state.Competitors);
            comp.Stats.WorstPossibleRank = CalculateProjectedWPARank(
                comp.Stats.WorstPossibleAverage,
                comp.WcaId,
                state.Competitors);

            comp.Stats.NeededForFirst = CalculateNeededForRank(comp, state.Competitors, 1);
            comp.Stats.NeededForPodium = CalculateNeededForRank(comp, state.Competitors, 3);
        }
    }

    private static double? CalculateAo5(Solve?[] solves)
    {
        if (solves == null || solves.Length < 5 || solves.Any(s => s == null))
            return null;

        var times = solves.Select(s => s!.Penalty == "dnf" ? double.MaxValue : s.Time).ToList();
        return FinalizeAo5(times);
    }

    private static int? CalculateRank(double? average, string currentId, IEnumerable<Competitor> allCompetitors)
    {
        if (average == null) return null;

        var me = allCompetitors.FirstOrDefault(c => c.WcaId == currentId);

        if (me == null) return null;

        var myBest = GetBestSingle(me.Solves);
        var myAvg = average == -1 ? double.PositiveInfinity : average;

        var betterCount = allCompetitors.Count(opp =>
        {
            if (opp.WcaId == currentId || opp.Stats.Average == null)
                return false;

            var oppAvg = opp.Stats.Average == -1 ? double.PositiveInfinity : opp.Stats.Average.Value;
            var oppBest = GetBestSingle(opp.Solves);

            if (oppAvg < myAvg)
                return true;

            if (Math.Abs(oppAvg - (double)myAvg) < 0.0001)
            {
                if (oppBest < myBest)
                    return true;
            }

            return false;
        });

        return betterCount + 1;
    }

    private static double? CalculateBPA(Solve?[] solves)
    {
        var existingTimes = GetExistingTimes(solves);

        if (existingTimes.Count != 4) return null;

        // Best case: Assume the 5th solve is a 0.00
        var projected = new List<double>(existingTimes) { 0.00 };

        return FinalizeAo5(projected);
    }

    private static int? CalculateProjectedBPARank(double? targetBPA, string currentId, IEnumerable<Competitor> allCompetitors)
    {
        if (targetBPA == null) return null;

        const double myBestIfZero = 0.00;

        var betterCount = allCompetitors.Count(opp =>
        {
            if (opp.WcaId == currentId || opp.Stats.Average == null)
                return false;

            var oppAvg = opp.Stats.Average == -1 ? double.PositiveInfinity : opp.Stats.Average.Value;
            var myAvg = targetBPA == -1 ? double.PositiveInfinity : targetBPA.Value;

            if (oppAvg < myAvg)
                return true;

            if (Math.Abs(oppAvg - myAvg) < 0.0001)
            {
                if (GetBestSingle(opp.Solves) < myBestIfZero)
                    return true;
            }

            return false;
        });

        return betterCount + 1;
    }

    private static double? CalculateWPA(Solve?[] solves)
    {
        var existingTimes = GetExistingTimes(solves);

        if (existingTimes.Count != 4) return null;

        // Worst case: Assume the 5th solve is a DNF (Infinity)
        var projected = new List<double>(existingTimes) { double.MaxValue };

        return FinalizeAo5(projected);
    }

    private static int? CalculateProjectedWPARank(double? targetWPA, string currentId, IEnumerable<Competitor> allCompetitors)
    {
        if (targetWPA == null) return null;

        var betterCount = allCompetitors.Count(opp =>
        {
            if (opp.WcaId == currentId || opp.Stats.Average == null)
                return false;

            var oppAvg = opp.Stats.Average == -1 ? double.PositiveInfinity : opp.Stats.Average.Value;
            var myAvg = targetWPA == -1 ? double.PositiveInfinity : targetWPA.Value;

            if (oppAvg < myAvg)
                return true;

            if (Math.Abs(oppAvg - myAvg) < 0.0001)
            {
                var me = allCompetitors.FirstOrDefault(c => c.WcaId == currentId);
                if (me != null && GetBestSingle(opp.Solves) < GetBestSingle(me.Solves))
                    return true;
            }

            return false;
        });

        return betterCount + 1;
    }

    private static List<double> GetExistingTimes(Solve?[] solves)
    {
        return [.. solves
            .Where(s => s != null)
            .Select(s => s!.Penalty == "dnf" ? double.MaxValue : s.Time)];
    }

    private static double? FinalizeAo5(List<double> times)
    {
        if (times.Count(t => t == double.MaxValue) > 1)
            return -1;

        var sorted = times.OrderBy(t => t).ToList();

        var middleThree = sorted.Skip(1).Take(3);
        return Math.Truncate(100 * middleThree.Average()) / 100;
    }

    private static double? GetBestSingle(Solve?[] solves)
    {
        if (solves == null || solves.Length == 0)
            return null;

        var validTimes = solves
            .Where(s => s != null && s.Penalty?.ToLower() != "dnf")
            .Select(s => s.Time);

        if (!validTimes.Any())
            return double.PositiveInfinity;

        return validTimes.Min();
    }

    private static double? CalculateNeededForRank(Competitor competitor, List<Competitor> allCompetitors, int targetRank)
    {
        var currentSolves = GetExistingTimes(competitor.Solves);

        if (currentSolves.Count != 4) return null;

        var validCompetitors = allCompetitors
            .Where(c => c.WcaId != competitor.WcaId 
            && c.Stats.CurrentRank != null 
            && c.Stats.CurrentRank == targetRank)
            .ToList();

        // If target rank is higher than total competitors, any time works
        if (targetRank > validCompetitors.Count) return -1;

        var targetCompetitor = validCompetitors[targetRank - 1];
        var lAvg = targetCompetitor.Stats.Average!.Value;
        var lBest = GetBestSingle(targetCompetitor.Solves);

        var sortedV = currentSolves.OrderBy(s => s).ToList();
        double targetSum = Math.Round(lAvg * 3.0 * 100) / 100;

        bool CheckTime(double x)
        {
            var allFive = new List<double>(currentSolves) { x };
            allFive.Sort();

            // Remove best and worst, sum middle three
            double sumMiddle = allFive[1] + allFive[2] + allFive[3];
            double myAvg = Math.Round((sumMiddle / 3.0) * 100) / 100;
            double myBest = allFive[0];

            if (myAvg < lAvg) return true;
            // if averages are tied, better single wins
            if (Math.Abs(myAvg - lAvg) < 0.001 && myBest <= lBest) return true;

            return false;
        }

        if (CheckTime(double.PositiveInfinity)) return -1;
        if (!CheckTime(0.00)) return null; // Can't achieve that rank

        double xWin = targetSum - sortedV[1] - sortedV[2];

        // Tie-break Logic
        double myBestWithX = Math.Min(sortedV[0], xWin);
        if (myBestWithX >= lBest)
            // If we can't win the tie-break, we must beat the average by at least 0.01
            xWin = (targetSum - 0.01) - sortedV[1] - sortedV[2];

        xWin = Math.Round(xWin * 100) / 100;

        return xWin >= 0 ? xWin : null;
    }

}
