using System.Text.Json.Serialization;

namespace Api.Models;

public record PullRequest(
    [property: JsonPropertyName("connectionId")] string ConnectionId);

public record PushRequest(
    [property: JsonPropertyName("connectionId")] string ConnectionId,
    [property: JsonPropertyName("tables")] Dictionary<string, List<Dictionary<string, object?>>> Tables);

public record ValidateRequest(
    [property: JsonPropertyName("connectionId")] string ConnectionId);

public record WorkflowAccepted(string Message, string ConnectionId);
