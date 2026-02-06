using CubingLayout.Helper;
using CubingLayout.Hubs;
using CubingLayout.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace CubingLayout.Api;

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
        IHubContext<OverlayHub> hub)
    {
        var existingCompetitor = state.Competitors.FirstOrDefault(c => c.WcaId == competitor.WcaId);

        if (existingCompetitor != null)
        {
            existingCompetitor.Name = competitor.Name;
            existingCompetitor.Country = competitor.Country;
            existingCompetitor.Stats.PersonalBestSingle = competitor.Stats.PersonalBestSingle;
            existingCompetitor.Stats.PersonalBestAverage = competitor.Stats.PersonalBestAverage;
        }
        else
        {
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

        var currentCompetitors = state.Competitors.FindAll(c =>
            c.WcaId == state.Round.LeftCompetitorWcaId ||
            c.WcaId == state.Round.RightCompetitorWcaId);

        foreach (var competitor in currentCompetitors)
        {
            competitor.Stats.Average = AverageCalculator.CalculateAo5(competitor.Solves);
            competitor.Stats.BestPossibleAverage = AverageCalculator.CalculateBPA(competitor.Solves);
            competitor.Stats.WorstPossibleAverage = AverageCalculator.CalculateWPA(competitor.Solves);
        }

        await NotifyStateUpdated(state, hub);
        return Results.Ok();
    }

    private static Task NotifyStateUpdated(
        CompetitionState state,
        IHubContext<OverlayHub> hub) => hub.Clients.All.SendAsync("StateUpdated", state);
}
