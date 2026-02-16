using System.Text.Json.Serialization;

namespace CubingOverlays.Models;

public class WcaPersonResponse
{
    public WcaPerson Person { get; set; }

    [JsonPropertyName("personal_records")]
    public Dictionary<string, WcaEventRecord> PersonalRecords { get; set; }
}

public class WcaPerson
{
    public string Name { get; set; }

    [JsonPropertyName("country_iso2")]
    public string CountryIso2 { get; set; }
}

public class WcaEventRecord
{
    public WcaBest Single { get; set; }
    public WcaBest Average { get; set; }
}

public class WcaBest
{
    public int Best { get; set; } // This is in centiseconds
}

// WCA Live API Response Models
public class WcaLiveCompetitionResponse
{
    [JsonPropertyName("events")]
    public List<WcaLiveEvent> Events { get; set; } = new();

    [JsonPropertyName("persons")]
    public List<WcaLivePerson> Persons { get; set; } = new();
}

public class WcaLiveEvent
{
    [JsonPropertyName("eventId")]
    public string EventId { get; set; }

    [JsonPropertyName("rounds")]
    public List<WcaLiveRound> Rounds { get; set; } = new();
}

public class WcaLiveRound
{
    [JsonPropertyName("number")]
    public int Number { get; set; }

    [JsonPropertyName("results")]
    public List<WcaLiveResult> Results { get; set; } = new();
}

public class WcaLiveResult
{
    [JsonPropertyName("ranking")]
    public int Ranking { get; set; }

    [JsonPropertyName("personId")]
    public int PersonId { get; set; }

    [JsonPropertyName("best")]
    public int Best { get; set; } // In centiseconds

    [JsonPropertyName("average")]
    public int Average { get; set; } // In centiseconds

    [JsonPropertyName("attempts")]
    public List<int> Attempts { get; set; } = new();
}

public class WcaLivePerson
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; }

    [JsonPropertyName("country")]
    public string Country { get; set; }

    [JsonPropertyName("wcaId")]
    public string WcaId { get; set; }
}

// Filtered response with person data included
public class FilteredRankingResult
{
    [JsonPropertyName("ranking")]
    public int Ranking { get; set; }

    [JsonPropertyName("eventId")]
    public string EventId { get; set; }

    [JsonPropertyName("roundNumber")]
    public int RoundNumber { get; set; }

    [JsonPropertyName("best")]
    public int Best { get; set; }

    [JsonPropertyName("average")]
    public int Average { get; set; }

    [JsonPropertyName("attempts")]
    public List<int> Attempts { get; set; } = [];

    [JsonPropertyName("person")]
    public WcaLivePerson Person { get; set; }
}

public class FilteredRankingResponse
{
    [JsonPropertyName("competitionName")]
    public string CompetitionName { get; set; }

    [JsonPropertyName("eventName")]
    public string EventName { get; set; }

    [JsonPropertyName("eventId")]
    public string EventId { get; set; }

    [JsonPropertyName("format")]
    public string Format { get; set; }

    [JsonPropertyName("roundNumber")]
    public int RoundNumber { get; set; }

    [JsonPropertyName("results")]
    public List<FilteredRankingResult> Results { get; set; } = new();
}

// WCIF Response Models
public class WcaWcifResponse
{
    [JsonPropertyName("id")]
    public string Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; }

    [JsonPropertyName("events")]
    public List<WcaWcifEvent> Events { get; set; } = new();
}

public class WcaWcifEvent
{
    [JsonPropertyName("id")]
    public string Id { get; set; }

    [JsonPropertyName("rounds")]
    public List<WcaWcifRound> Rounds { get; set; } = new();
}

public class WcaWcifRound
{
    [JsonPropertyName("id")]
    public string Id { get; set; }

    [JsonPropertyName("format")]
    public string Format { get; set; }

    [JsonPropertyName("timeLimit")]
    public WcaTimeLimit TimeLimit { get; set; }

    [JsonPropertyName("cutoff")]
    public WcaCutoff Cutoff { get; set; }
}

public class WcaTimeLimit
{
    [JsonPropertyName("centiseconds")]
    public int Centiseconds { get; set; }
}

public class WcaCutoff
{
    [JsonPropertyName("numberOfAttempts")]
    public int NumberOfAttempts { get; set; }

    [JsonPropertyName("attemptResult")]
    public int AttemptResult { get; set; }
}





