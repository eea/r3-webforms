namespace Api.Services;

/// <summary>
/// Scoped store for the per-user RN3 Bearer token.
/// Controllers capture the token from the session before launching background tasks,
/// then set it here so Rn3Service can read it outside the HTTP request lifetime.
/// </summary>
public class Rn3TokenStore
{
    public string? Token { get; set; }
}
