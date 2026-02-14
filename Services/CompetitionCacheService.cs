using CubingOverlays.Models;

namespace CubingOverlays.Services;

public interface ICompetitionCacheService
{
    void CacheWcaLiveCompetitionData(string competitionId, WcaLiveCompetitionResponse data);
    void CacheWcifCompetitionData(string competitionId, WcaWcifResponse data);
    WcaLiveCompetitionResponse? GetCachedWcaLiveCompetitionData(string competitionId);
    WcaWcifResponse? GetCachedWcifCompetitionData(string competitionId);
}

public class CompetitionCacheService : ICompetitionCacheService
{
    private readonly Dictionary<string, WcaLiveCompetitionResponse> _cacheWcaLive = [];
    private readonly Dictionary<string, WcaWcifResponse> _cacheWcif = [];

    public void CacheWcaLiveCompetitionData(string competitionId, WcaLiveCompetitionResponse data)
    {
        _cacheWcaLive[competitionId] = data;
        Console.WriteLine($"Competition {competitionId} WCA Live data cached");
    }

    public void CacheWcifCompetitionData(string competitionId, WcaWcifResponse data)
    {
        _cacheWcif[competitionId] = data;
        Console.WriteLine($"Competition {competitionId} WCIF data cached");
    }

    public WcaLiveCompetitionResponse? GetCachedWcaLiveCompetitionData(string competitionId)
    {
        _cacheWcaLive.TryGetValue(competitionId, out var data);
        return data;
    }

    public WcaWcifResponse? GetCachedWcifCompetitionData(string competitionId)
    {
        _cacheWcif.TryGetValue(competitionId, out var data);
        return data;
    }
}
