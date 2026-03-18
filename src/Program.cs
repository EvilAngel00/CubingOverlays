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

app.Run();
