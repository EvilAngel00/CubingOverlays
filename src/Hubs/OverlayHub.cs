using CubingOverlays.Models;
using CubingOverlays.Services;
using Microsoft.AspNetCore.SignalR;

namespace CubingOverlays.Hubs;

public class OverlayHub : Hub
{
    private readonly ICompetitionCacheService _cacheService;
    private static FilteredRankingResponse? LastSentRankings { get; set; }
    private static Settings CurrentSettings { get; set; } = new();

    public OverlayHub(ICompetitionCacheService cacheService)
    {
        _cacheService = cacheService;
    }

    public async Task RequestRankings(string competitionId, string eventId, int roundNumber)
    {
        // Get cached competition data
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
                await Clients.All.SendAsync("RankingsError", "No rankings found for the selected event and round.");
                return;
            }

            // Cache the last sent rankings
            LastSentRankings = filteredResponse;

            // Send filtered rankings to all clients
            await Clients.All.SendAsync("RankingsReceived", filteredResponse);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error filtering rankings: {ex.Message}");
            await Clients.Caller.SendAsync("RankingsError", "Error processing rankings.");
        }
    }

    public async Task<FilteredRankingResponse?> GetLastRankings()
    {
        if (LastSentRankings == null)
        {
            Console.WriteLine("No last rankings cached");
            return null;
        }

        Console.WriteLine($"Returning cached rankings for {LastSentRankings.EventName} Round {LastSentRankings.RoundNumber}");
        return LastSentRankings;
    }

    public async Task UpdateDisplaySettings(Settings settings)
    {
        CurrentSettings = settings;
        // Broadcast to all connected overlays (and the settings page itself)
        await Clients.All.SendAsync("SettingsUpdated", CurrentSettings);
    }

    public async Task<Settings> GetDisplaySettings() => CurrentSettings;

    public async Task<Settings> ResetDisplaySettings() {
        CurrentSettings = new();
        await Clients.All.SendAsync("SettingsUpdated", CurrentSettings);
        return CurrentSettings;
    }

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
            { "333", "3x3x3 Cube" },
            { "222", "2x2x2 Cube" },
            { "444", "4x4x4 Cube" },
            { "555", "5x5x5 Cube" },
            { "666", "6x6x6 Cube" },
            { "777", "7x7x7 Cube" },
            { "333bf", "3x3x3 Blindfolded" },
            { "333fm", "3x3x3 Fewest Moves" },
            { "333oh", "3x3x3 One-Handed" },
            { "clock", "Clock" },
            { "minx", "Megaminx" },
            { "pyram", "Pyraminx" },
            { "skewb", "Skewb" },
            { "sq1", "Square-1" },
            { "333mbf", "3x3x3 Multi-Blind" }
        };

        return eventNames.TryGetValue(eventId, out var name) ? name : eventId;
    }
}
