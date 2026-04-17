using HouseholdOps.Infrastructure;
using HouseholdOps.Infrastructure.Auth;
using HouseholdOps.Infrastructure.Options;
using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Modules.Administration;
using HouseholdOps.Modules.Chores;
using HouseholdOps.Modules.Display;
using HouseholdOps.Modules.Households;
using HouseholdOps.Modules.Identity;
using HouseholdOps.Modules.Integrations;
using HouseholdOps.Modules.Notifications;
using HouseholdOps.Modules.Scheduling;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddProblemDetails();
builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        var authOptions = builder.Configuration
            .GetSection(AuthOptions.SectionName)
            .Get<AuthOptions>() ?? new AuthOptions();

        options.Cookie.Name = authOptions.CookieName;
        options.LoginPath = "/login";
        options.SlidingExpiration = true;
        options.EventsType = typeof(PersistedSessionCookieEvents);
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.SecurePolicy = authOptions.RequireSecureCookies
            ? CookieSecurePolicy.Always
            : CookieSecurePolicy.SameAsRequest;
        options.ExpireTimeSpan = TimeSpan.FromDays(authOptions.SessionLifetimeDays);
    });
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(
        AuthorizationPolicies.ActiveHouseholdOwner,
        policy => policy.RequireAuthenticatedUser()
            .AddRequirements(new ActiveHouseholdOwnerRequirement()));
});

builder.Services.AddHouseholdOpsPersistence(builder.Configuration);
builder.Services.AddHouseholdsModule();
builder.Services.AddIdentityModule();
builder.Services.AddIntegrationsModule();
builder.Services.AddNotificationsModule();
builder.Services.AddSchedulingModule();
builder.Services.AddDisplayModule();
builder.Services.AddAdministrationModule();
builder.Services.AddChoresModule();

var app = builder.Build();

await using (var scope = app.Services.CreateAsyncScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<HouseholdOpsDbContext>();
    await dbContext.Database.MigrateAsync();
}

app.UseExceptionHandler();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new
{
    status = "ok",
    service = "api",
    time = DateTimeOffset.UtcNow
}));

app.MapGet("/", () => Results.Ok(new
{
    name = "HouseholdOps API",
    version = "bootstrap",
    modules = new[]
    {
        "Households",
        "Identity",
        "Integrations",
        "Scheduling",
        "Display",
        "Administration"
    }
}));

app.MapHouseholdsModule();
app.MapIdentityModule();
app.MapIntegrationsModule();
app.MapNotificationsModule();
app.MapSchedulingModule();
app.MapDisplayModule();
app.MapAdministrationModule();
app.MapChoresModule();

app.Run();
