using Api.Configuration;
using Api.Hubs;
using Api.Middleware;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseUrls("http://localhost:3000");

// Configuration
var rn3Options = builder.Configuration.GetSection("RN3").Get<RN3Options>()!;
var lockOptions = builder.Configuration.GetSection("Lock").Get<LockOptions>() ?? new LockOptions();
builder.Services.Configure<RN3Options>(builder.Configuration.GetSection("RN3"));
builder.Services.Configure<LockOptions>(builder.Configuration.GetSection("Lock"));

// HTTP client for RN3
builder.Services.AddHttpClient("rn3", client =>
{
    client.BaseAddress = new Uri(rn3Options.ApiUrl);
    if (!string.IsNullOrEmpty(rn3Options.ApiKey))
        client.DefaultRequestHeaders.Add("Authorization", $"ApiKey {rn3Options.ApiKey}");
});

// Session (server-side, in-memory)
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromHours(8);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
    options.Cookie.SameSite = SameSiteMode.Lax;
});

// CORS
var allowedOrigins = (builder.Configuration["AllowedOrigins"] ?? "http://localhost:5173,http://localhost:5174")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

// Controllers + SignalR
builder.Services.AddControllers();
builder.Services.AddSignalR();

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseCors();
app.UseSession();
app.UseMiddleware<SessionAuthMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapControllers();
app.MapHub<WorkflowHub>("/hubs/workflow");
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));

app.Run();
