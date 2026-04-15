using CubingOverlays.Models;
using CubingOverlays.Services;
using Microsoft.AspNetCore.SignalR;

namespace CubingOverlays.Hubs;

public class OverlayHub : Hub
{
    private readonly ICompetitionCacheService _cacheService;
    private readonly H2hState _state;
    private readonly IHttpClientFactory _httpClientFactory;

    private static FilteredRankingResponse? LastSentRankings { get; set; }
    private static EventDisplayState CurrentEventDisplays { get; set; } = new();
    private static Settings CurrentSettings { get; set; } = new();

    public OverlayHub(ICompetitionCacheService cacheService, H2hStateHolder stateHolder, IHttpClientFactory httpClientFactory)
    {
        _cacheService = cacheService;
        _state = stateHolder.State;
        _httpClientFactory = httpClientFactory;
    }

    // ── H2H State ─────────────────────────────────────────────────────────────

    public H2hState GetState() => _state;

    public async Task<H2hState> UpdateState(H2hState updatedState)
    {
        _state.LeftCompetitorWcaId = updatedState.LeftCompetitorWcaId;
        _state.RightCompetitorWcaId = updatedState.RightCompetitorWcaId;
        _state.LeftGroupWcaIds = updatedState.LeftGroupWcaIds;
        _state.RightGroupWcaIds = updatedState.RightGroupWcaIds;
        _state.Competitors = updatedState.Competitors;

        CompetitionService.UpdateCompetitorStats(_state);

        await Clients.Others.SendAsync("StateUpdated", _state);
        return _state;
    }

    public async Task<H2hState> AddCompetitor(Competitor competitor)
    {
        var existing = _state.Competitors.FirstOrDefault(c => c.WcaId == competitor.WcaId);
        if (existing != null)
        {
            existing.Name = competitor.Name;
            existing.Country = competitor.Country;
        }
        else
        {
            competitor = await FetchWcaInfo(competitor);
            _state.Competitors.Add(competitor);
            if (_state.LeftGroupWcaIds.Count <= _state.RightGroupWcaIds.Count)
                _state.LeftGroupWcaIds.Add(competitor.WcaId);
            else
                _state.RightGroupWcaIds.Add(competitor.WcaId);
        }

        await Clients.Others.SendAsync("StateUpdated", _state);
        return _state;
    }

    public async Task<H2hState> UpdateCompetitor(Competitor competitor)
    {
        var existing = _state.Competitors.FirstOrDefault(c => c.WcaId == competitor.WcaId);
        if (existing != null)
        {
            existing.Name = competitor.Name;
            existing.Country = competitor.Country;
        }

        await Clients.Others.SendAsync("StateUpdated", _state);
        return _state;
    }

    public async Task<H2hState> DeleteCompetitor(string wcaId)
    {
        var competitor = _state.Competitors.FirstOrDefault(c => c.WcaId == wcaId);
        if (competitor != null)
        {
            _state.Competitors.Remove(competitor);
            _state.LeftGroupWcaIds.Remove(wcaId);
            _state.RightGroupWcaIds.Remove(wcaId);
            if (_state.LeftCompetitorWcaId == wcaId) _state.LeftCompetitorWcaId = null;
            if (_state.RightCompetitorWcaId == wcaId) _state.RightCompetitorWcaId = null;
        }

        await Clients.Others.SendAsync("StateUpdated", _state);
        return _state;
    }

    public async Task<H2hState> ImportState(H2hState importedState)
    {
        _state.LeftCompetitorWcaId = importedState.LeftCompetitorWcaId;
        _state.RightCompetitorWcaId = importedState.RightCompetitorWcaId;
        _state.LeftGroupWcaIds = importedState.LeftGroupWcaIds;
        _state.RightGroupWcaIds = importedState.RightGroupWcaIds;
        _state.Competitors.Clear();
        foreach (var competitor in importedState.Competitors)
            _state.Competitors.Add(await FetchWcaInfo(competitor));

        CompetitionService.UpdateCompetitorStats(_state);

        await Clients.Others.SendAsync("StateUpdated", _state);
        return _state;
    }

    public async Task<H2hState> BatchImportCompetitors(IEnumerable<string> wcaIds)
    {
        foreach (var id in wcaIds.Reverse())
        {
            var normalizedId = id.ToUpper();
            if (_state.Competitors.Any(c => c.WcaId == normalizedId)) continue;

            var competitor = await FetchWcaInfo(new Competitor(normalizedId, "Fetching...", "--"));
            _state.Competitors.Add(competitor);
            if (_state.LeftGroupWcaIds.Count <= _state.RightGroupWcaIds.Count)
                _state.LeftGroupWcaIds.Add(competitor.WcaId);
            else
                _state.RightGroupWcaIds.Add(competitor.WcaId);
        }

        await Clients.Others.SendAsync("StateUpdated", _state);
        return _state;
    }

    private async Task<Competitor> FetchWcaInfo(Competitor competitor)
    {
        try
        {
            var client = _httpClientFactory.CreateClient();
            var response = await client.GetAsync($"https://www.worldcubeassociation.org/api/v0/persons/{competitor.WcaId.ToUpper()}");
            if (response.IsSuccessStatusCode)
            {
                var wcaData = await response.Content.ReadFromJsonAsync<WcaPersonResponse>();
                if (wcaData?.Person != null)
                {
                    competitor.Name = wcaData.Person.Name;
                    competitor.Country = wcaData.Person.CountryIso2;
                    if (wcaData.PersonalRecords?.TryGetValue("333", out var records) == true)
                    {
                        competitor.Stats.PersonalBestSingle = records.Single?.Best / 100.0 ?? 0;
                        competitor.Stats.PersonalBestAverage = records.Average?.Best / 100.0 ?? 0;
                        Console.WriteLine($"Fetched {competitor.Name}: Single {competitor.Stats.PersonalBestSingle}s, Avg {competitor.Stats.PersonalBestAverage}s");
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"WCA API Error: {ex.Message}");
        }
        return competitor;
    }

    // ── Rankings ──────────────────────────────────────────────────────────────

    public async Task RequestRankings(string competitionId, string eventId, int roundNumber)
    {
        var competitionData = _cacheService.GetCachedWcaLiveCompetitionData(competitionId);
        var competitionWcifData = _cacheService.GetCachedWcifCompetitionData(competitionId);

        if (competitionData == null)
        {
            await Clients.Caller.SendAsync("RankingsError", "Competition data not found. Please fetch the competition first.");
            return;
        }

        try
        {
            var filteredResponse = FilterRankings(competitionData, competitionWcifData, eventId, roundNumber);

            if (filteredResponse == null)
            {
                await Clients.Caller.SendAsync("RankingsError", "No rankings found for the selected event and round.");
                return;
            }

            LastSentRankings = filteredResponse;
            await Clients.Others.SendAsync("RankingsReceived", filteredResponse);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error filtering rankings: {ex.Message}");
            await Clients.Caller.SendAsync("RankingsError", "Error processing rankings.");
        }
    }

    public Task<FilteredRankingResponse?> GetLastRankings() => Task.FromResult(LastSentRankings);

    // ── Event Displays ────────────────────────────────────────────────────────

    public async Task UpdateEventDisplays(EventDisplayState newState)
    {
        CurrentEventDisplays = newState;
        Console.WriteLine($"Event Displays updated: Primary={newState.Primary.Event}, Secondary={newState.Secondary.Event}");
        await Clients.Others.SendAsync("EventDisplaysUpdated", CurrentEventDisplays);
    }

    // ── Settings ──────────────────────────────────────────────────────────────

    public async Task UpdateDisplaySettings(Settings settings)
    {
        CurrentSettings = settings;
        await Clients.Others.SendAsync("SettingsUpdated", CurrentSettings);
    }

    public Task<Settings> GetDisplaySettings() => Task.FromResult(CurrentSettings);

    public async Task<Settings> ResetDisplaySettings()
    {
        CurrentSettings = new();
        await Clients.Others.SendAsync("SettingsUpdated", CurrentSettings);
        return CurrentSettings;
    }

    // ── Private: Ranking helpers ──────────────────────────────────────────────

    private static FilteredRankingResponse? FilterRankings(
        WcaLiveCompetitionResponse competitionData,
        WcaWcifResponse? wcaWcifData,
        string eventId,
        int roundNumber
        )
    {
        if (competitionData == null)
            return null;

        // Find the event
        var eventData = competitionData.Events.FirstOrDefault(e => e.EventId == eventId);
        if (eventData == null)
            return null;

        // Find the round
        var roundData = eventData.Rounds.FirstOrDefault(r => r.Number == roundNumber);
        if (roundData == null)
            return null;

        // Build person map
        var personMap = new Dictionary<int, WcaLivePerson>();
        if (competitionData.Persons != null)
        {
            foreach (var person in competitionData.Persons)
            {
                personMap[person.Id] = person;
            }
        }

        // Filter and enrich results
        var filteredResults = roundData.Results
            .OrderBy(r => r.Ranking)
            .Select(result => new FilteredRankingResult
            {
                Ranking = result.Ranking,
                EventId = eventId,
                RoundNumber = roundNumber,
                Best = result.Best,
                Average = result.Average,
                Attempts = result.Attempts,
                Person = personMap.TryGetValue(result.PersonId, out var person) 
                    ? person 
                    : new WcaLivePerson { Id = result.PersonId, Name = "Unknown" }
            })
            .ToList();

        var format = wcaWcifData?.Events
            .FirstOrDefault(e => e.Id == eventId)?.Rounds
            .FirstOrDefault(r => r.Id == $"{eventId}-r{roundNumber}")?.Format ?? "";
        return new FilteredRankingResponse
        {
            CompetitionName = wcaWcifData != null ? wcaWcifData.Name : "",
            EventName = GetEventName(eventId),
            EventId = eventId,
            Format = format,
            RoundNumber = roundNumber,
            Results = filteredResults
        };
    }

    private static string GetEventName(string eventId)
    {
        var eventNames = new Dictionary<string, string>
        {
            { "333", "3x3" },
            { "222", "2x2" },
            { "444", "4x4" },
            { "555", "5x5" },
            { "666", "6x6" },
            { "777", "7x7" },
            { "333bf", "3BLD" },
            { "333fm", "FMC" },
            { "333oh", "OH" },
            { "clock", "Clock" },
            { "minx", "Megaminx" },
            { "pyram", "Pyraminx" },
            { "skewb", "Skewb" },
            { "sq1", "Square-1" },
            { "333mbf", "Multiblind" },
            { "444bf", "4BLD" },
            { "555bf", "5BLD" }
        };

        return eventNames.TryGetValue(eventId, out var name) ? name : eventId;
    }
}
