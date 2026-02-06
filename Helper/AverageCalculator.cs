using CubingLayout.Models;

namespace CubingLayout.Helper;

public static class AverageCalculator
{
    public static double? CalculateAo5(Solve?[] solves)
    {
        if (solves == null || solves.Length < 5 || solves.Any(s => s == null))
            return null;

        var times = solves.Select(s => s!.Penalty == "dnf" ? double.MaxValue : s.Time).ToList();
        return FinalizeAo5(times);
    }

    public static double? CalculateBPA(Solve?[] solves)
    {
        var existingTimes = GetExistingTimes(solves);

        if (existingTimes.Count != 4) return null;

        // Best case: Assume the 5th solve is a 0.00
        var projected = new List<double>(existingTimes) { 0.00 };

        return FinalizeAo5(projected);
    }

    public static double? CalculateWPA(Solve?[] solves)
    {
        var existingTimes = GetExistingTimes(solves);

        if (existingTimes.Count != 4) return null;

        // Worst case: Assume the 5th solve is a DNF (Infinity)
        var projected = new List<double>(existingTimes) { double.MaxValue };

        return FinalizeAo5(projected);
    }

    private static List<double> GetExistingTimes(Solve?[] solves)
    {
        return [.. solves
            .Where(s => s != null)
            .Select(s => s!.Penalty == "dnf" ? double.MaxValue : s.Time)];
    }

    private static double? FinalizeAo5(List<double> times)
    {
        // Two DNFs in an Ao5 results in a DNF average
        if (times.Count(t => t == double.MaxValue) > 1)
            return -1;

        var sorted = times.OrderBy(t => t).ToList();

        // Remove index 0 (best) and index 4 (worst)
        // Average the middle 3
        var middleThree = sorted.Skip(1).Take(3);
        return Math.Round(middleThree.Average(), 2);
    }
}
