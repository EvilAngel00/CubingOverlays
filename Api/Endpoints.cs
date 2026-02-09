using CubingOverlays.Hubs;
using CubingOverlays.Models;
using CubingOverlays.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace CubingOverlays.Api;

public static class Endpoints
{
    public static IEndpointRouteBuilder MapEndpoints(
        this IEndpointRouteBuilder app)
    {
        var api = app.MapGroup("/api");

        api.MapGet("/state", GetState);
        api.MapPost("/updateState", UpdateState);
        api.MapPost("/addCompetitor", AddCompetitor);
        api.MapDelete("/competitor/{wcaId}", DeleteCompetitor);

        return app;
    }

    private static IResult GetState(CompetitionState state) => Results.Ok(state);

    private static async Task<IResult> AddCompetitor(
        Competitor competitor,
        CompetitionState state,
        IHubContext<OverlayHub> hub,
        IHttpClientFactory httpClientFactory)
    {
        var existingCompetitor = state.Competitors.FirstOrDefault(c => c.WcaId == competitor.WcaId);

        if (existingCompetitor != null)
        {
            existingCompetitor.Name = competitor.Name;
            existingCompetitor.Country = competitor.Country;
        }
        else
        {
            try
            {
                var client = httpClientFactory.CreateClient();
                var response = await client.GetAsync($"https://www.worldcubeassociation.org/api/v0/persons/{competitor.WcaId.ToUpper()}");

                if (response.IsSuccessStatusCode)
                {
                    var wcaData = await response.Content.ReadFromJsonAsync<WcaPersonResponse>();
                    if (wcaData?.Person != null)
                    {
                        competitor.Name = wcaData.Person.Name;
                        competitor.Country = wcaData.Person.CountryIso2;

                        if (wcaData.PersonalRecords != null &&
                            wcaData.PersonalRecords.TryGetValue("333", out var records))
                        {
                            // Convert centiseconds to seconds
                            var singlePB = records.Single?.Best / 100.0 ?? 0;
                            var averagePB = records.Average?.Best / 100.0 ?? 0;

                            competitor.Stats.PersonalBestSingle = singlePB;
                            competitor.Stats.PersonalBestAverage = averagePB;

                            Console.WriteLine($"Fetched {competitor.Name}: Single {singlePB}s, Avg {averagePB}s");
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"WCA API Error: {ex.Message}");
            }

            state.Competitors.Add(competitor);
            if (state.Round.LeftGroupWcaIds.Count <= state.Round.RightGroupWcaIds.Count)
                state.Round.LeftGroupWcaIds.Add(competitor.WcaId);
            else
                state.Round.RightGroupWcaIds.Add(competitor.WcaId);
        }

        await NotifyStateUpdated(state, hub);
        return Results.Ok(state);
    }

    private static async Task<IResult> DeleteCompetitor(
        string wcaId,
        CompetitionState state,
        IHubContext<OverlayHub> hub)
    {
        var competitor = state.Competitors.FirstOrDefault(c => c.WcaId == wcaId);

        if (competitor == null)
            return Results.NotFound();

        state.Competitors.Remove(competitor);

        state.Round.LeftGroupWcaIds.Remove(wcaId);
        state.Round.RightGroupWcaIds.Remove(wcaId);

        if (state.Round.LeftCompetitorWcaId == wcaId)
            state.Round.LeftCompetitorWcaId = null;

        if (state.Round.RightCompetitorWcaId == wcaId)
            state.Round.RightCompetitorWcaId = null;

        await NotifyStateUpdated(state, hub);

        return Results.Ok(state);
    }

    private static async Task<IResult> UpdateState(
        [FromBody] CompetitionState updatedState,
        CompetitionState state,
        IHubContext<OverlayHub> hub)
    {
        state.Round = updatedState.Round;
        state.Competitors = updatedState.Competitors;

        CompetitionService.UpdateCompetitorStats(state);

        await NotifyStateUpdated(state, hub);
        return Results.Ok(state);
    }

    private static Task NotifyStateUpdated(
        CompetitionState state,
        IHubContext<OverlayHub> hub) => hub.Clients.All.SendAsync("StateUpdated", state);
}
