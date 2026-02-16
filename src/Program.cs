using CubingOverlays.Api;
using CubingOverlays.Hubs;
using CubingOverlays.Models;
using CubingOverlays.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<CompetitionState>();
builder.Services.AddSingleton<ICompetitionCacheService, CompetitionCacheService>();
builder.Services.AddSignalR();
builder.Services.AddHttpClient();

var app = builder.Build();

app.UseStaticFiles();
app.MapHub<OverlayHub>("/overlayHub");
app.MapEndpoints();



//SeedData(app.Services.GetRequiredService<CompetitionState>());

app.Run();

static void SeedData(CompetitionState state)
{
    var competitors = new List<Competitor>(){
        new(
            "2014SEBA01",
            "Juliette Sébastien",
            "FR"
        ),
        new(
            "2015CONT02",
            "Pablo Contreras",
            "FR"
        ),
        new(
            "2018LUCM01",
            "Mathis Luc",
            "FR"
        ),
        new(
            "2024DAMM01",
            "Yassine Dammak",
            "FR"
        ),
        new(
            "2013COLI02",
            "Victor Colin",
            "FR"
        ),
        new(
            "2012CARL03",
            "Alexandre Carlier",
            "FR"
        ),
        new(
            "2015DEGL01",
            "Lucas Déglise",
            "FR"
        ),
        new(
            "2013GERT01",
            "Nicolas Gertner Kilian",
            "FR"
        ),
        new(
            "2010DESJ01",
            "Jules Desjardin",
            "FR"
        ),
        new(
            "2018DALO01",
            "Charles Daloz-Baltenberger",
            "FR"
        ),
        new(
            "2019POUC01",
            "Alaric Pouchain",
            "FR"
        ),
        new(
            "2017RIVA09",
            "Quentin Rivault",
            "FR"
        ),
    };

    state.Competitors.AddRange(competitors);

    state.Round.LeftGroupWcaIds = [.. competitors.Where((c, i) => i % 2 != 0).Select(c => c.WcaId)];
    state.Round.RightGroupWcaIds = [.. competitors.Where((c, i) => i % 2 == 0).Select(c => c.WcaId)];
    state.Round.Event = "3x3";
    state.Round.RoundName = "Final";
}