namespace Api.Middleware;

public class SessionAuthMiddleware(RequestDelegate next)
{
    private static readonly string[] PublicPaths =
    [
        "/health",
        "/api/auth/login",
        "/swagger",
        "/hubs/"
    ];

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value ?? string.Empty;

        var isPublic = Array.Exists(PublicPaths, p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase));

        if (!isPublic && string.IsNullOrEmpty(context.Session.GetString("rn3_token")))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { error = "Not authenticated" });
            return;
        }

        await next(context);
    }
}
