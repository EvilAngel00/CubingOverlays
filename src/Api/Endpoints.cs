using CubingOverlays.Models;
using CubingOverlays.Services;

namespace CubingOverlays.Api;

public static class Endpoints
{
    public static IEndpointRouteBuilder MapEndpoints(
        this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/rankings/{competitionId}", GetRankings);
        return app;
    }

    private static async Task<IResult> GetRankings(
        string competitionId,
        IHttpClientFactory httpClientFactory,
        ICompetitionCacheService cacheService)
    {
        try
        {
            var client = httpClientFactory.CreateClient();

            var cachedWcif = cacheService.GetCachedWcifCompetitionData(competitionId);
            if (cachedWcif == null)
            {
                // Fetch event format information from WCIF
                var wcifUrl = $"https://www.worldcubeassociation.org/api/v0/competitions/{Uri.EscapeDataString(competitionId)}/wcif/public";
                var wcifResponse = await client.GetAsync(wcifUrl);

                var eventFormats = new Dictionary<string, Dictionary<int, string>>();

                if (wcifResponse.IsSuccessStatusCode)
                {
                    var wcifData = await wcifResponse.Content.ReadFromJsonAsync<WcaWcifResponse>();
                    if (wcifData?.Events != null)
                    {
                        foreach (var evt in wcifData.Events)
                        {
                            var roundFormats = new Dictionary<int, string>();
                            for (int i = 0; i < evt.Rounds.Count; i++)
                            {
                                roundFormats[i + 1] = evt.Rounds[i].Format;
                            }
                            eventFormats[evt.Id] = roundFormats;
                        }
                    }

                    if (wcifData != null)
                        cacheService.CacheWcifCompetitionData(competitionId, wcifData);    
                }
            }

            // Fetch from WCA Live API
            var liveUrl = $"https://live.worldcubeassociation.org/api/competitions/{Uri.EscapeDataString(competitionId)}/results";
            var response = await client.GetAsync(liveUrl);

            var rankings = await response.Content.ReadFromJsonAsync<WcaLiveCompetitionResponse>();

            if (rankings == null)
                return Results.BadRequest(new { error = "Invalid competition data" });

            // Cache the data
            cacheService.CacheWcaLiveCompetitionData(competitionId, rankings);

            return Results.Ok(rankings);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"WCA Live API Error: {ex.Message}");
            Console.WriteLine($"WCA API Error: {ex.Message}");
            return Results.StatusCode(500);
        }
    }
}


