using CubingLayout.Api;
using CubingLayout.Hubs;
using CubingLayout.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<CompetitionState>();
builder.Services.AddSignalR();

var app = builder.Build();

app.UseStaticFiles();
app.MapHub<OverlayHub>("/overlayHub");
app.MapEndpoints();

SeedData(app.Services.GetRequiredService<CompetitionState>());

app.Run();

static void SeedData(CompetitionState state)
{
    var rui = new Competitor(
        "2015REIS02",
        "Rui Reis",
        "CH"
    );

    var anela = new Competitor(
        "2018ARIF02",
        "Anela Arifovic Reis",
        "BA"
    );

    var sophian = new Competitor(
        "2019GUID01",
        "Sophian Guidara",
        "TN"
    );

    var martina = new Competitor(
       "2019BADT01",
       "Martina Badtke",
       "DE"
   );

    state.Competitors.AddRange([rui, anela, sophian, martina]);

    state.Round.Event = "3x3";
    state.Round.RoundName = "Final";
}