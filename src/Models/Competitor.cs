namespace CubingOverlays.Models;

public class Competitor
{
    public string WcaId { get; set; } = default!;
    public string Name { get; set; } = default!;
    public string Country { get; set; } = default!;
    public Solve?[] Solves { get; set; }
    public Statistics Stats { get; set; }

    public Competitor(string wcaId, string name, string country)
    {
        WcaId = wcaId;
        Name = name;
        Country = country;

        Solves = new Solve?[5];
        Stats = new();
    }

    public Competitor()
    {
        Solves = new Solve?[5];
        Stats = new();
    }
}