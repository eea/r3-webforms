namespace Api.Models;

public record LoginRequest(string Username, string Password);

public record UserInfo(string Username, string Email);

public record Rn3TokenResponse(string? AccessToken, string? Username, string? Email);
