using CubingOverlays.Models;

namespace CubingOverlays.Services;

public interface ICompetitionCacheService
{
    void CacheCompetition(string competitionId, WcaLiveCompetitionResponse data);
    WcaLiveCompetitionResponse? GetCachedCompetition(string competitionId);
}

public class CompetitionCacheService : ICompetitionCacheService
{
    private readonly Dictionary<string, WcaLiveCompetitionResponse> _cache = new();

    public void CacheCompetition(string competitionId, WcaLiveCompetitionResponse data)
    {
        _cache[competitionId] = data;
        Console.WriteLine($"Competition {competitionId} cached");
    }

    public WcaLiveCompetitionResponse? GetCachedCompetition(string competitionId)
    {
        _cache.TryGetValue(competitionId, out var data);
        return data;
    }
}
