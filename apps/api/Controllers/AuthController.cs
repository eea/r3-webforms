using Api.Models;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IHttpClientFactory httpClientFactory, ILogger<AuthController> logger) : ControllerBase
{
    private const string SessionKeyToken = "rn3_token";
    private const string SessionKeyUsername = "username";
    private const string SessionKeyEmail = "email";

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var client = httpClientFactory.CreateClient("rn3");

        var payload = new { username = request.Username, password = request.Password };
        var response = await client.PostAsJsonAsync("/user/generateToken", payload);

        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("RN3 login failed for user {Username}: {Status}", request.Username, response.StatusCode);
            return Unauthorized(new { error = "Invalid credentials" });
        }

        var body = await response.Content.ReadAsStringAsync();
        var tokenData = JsonSerializer.Deserialize<Rn3TokenResponse>(body, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        if (string.IsNullOrEmpty(tokenData?.AccessToken))
            return Unauthorized(new { error = "No token returned from RN3" });

        HttpContext.Session.SetString(SessionKeyToken, tokenData.AccessToken);
        HttpContext.Session.SetString(SessionKeyUsername, tokenData.Username ?? request.Username);
        HttpContext.Session.SetString(SessionKeyEmail, tokenData.Email ?? request.Username);

        return Ok(new UserInfo(
            HttpContext.Session.GetString(SessionKeyUsername)!,
            HttpContext.Session.GetString(SessionKeyEmail)!
        ));
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        HttpContext.Session.Clear();
        return NoContent();
    }

    [HttpGet("me")]
    public IActionResult Me()
    {
        var username = HttpContext.Session.GetString(SessionKeyUsername);
        if (string.IsNullOrEmpty(username))
            return Unauthorized(new { error = "Not authenticated" });

        return Ok(new UserInfo(username, HttpContext.Session.GetString(SessionKeyEmail)!));
    }
}
