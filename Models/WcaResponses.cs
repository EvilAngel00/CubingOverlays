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