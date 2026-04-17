using HouseholdOps.Infrastructure.Auth;
using HouseholdOps.Infrastructure.Chores;
using HouseholdOps.Infrastructure.Display;
using HouseholdOps.Infrastructure.Integrations;
using HouseholdOps.Infrastructure.Notifications;
using HouseholdOps.Infrastructure.Options;
using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Infrastructure.Scheduling;
using HouseholdOps.Modules.Chores;
using HouseholdOps.Modules.Display;
using HouseholdOps.Modules.Households;
using HouseholdOps.Modules.Identity;
using HouseholdOps.Modules.Integrations;
using HouseholdOps.Modules.Notifications;
using HouseholdOps.Modules.Scheduling;
using HouseholdOps.SharedKernel.Time;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace HouseholdOps.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddHouseholdOpsPersistence(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Postgres")
            ?? throw new InvalidOperationException("ConnectionStrings:Postgres is required.");

        services.Configure<AuthOptions>(configuration.GetSection(AuthOptions.SectionName));
        services.AddDbContext<HouseholdOpsDbContext>(options =>
            options.UseNpgsql(connectionString));

        services.AddScoped<CurrentHouseholdContext>();
        services.AddScoped<PersistedSessionCookieEvents>();
        services.AddScoped<IIdentityAccessService, IdentityAccessService>();
        services.AddScoped<IHouseholdContextService, HouseholdContextService>();
        services.AddScoped<IDisplayProjectionService, DisplayProjectionService>();
        services.AddScoped<IDisplayManagementService, DisplayManagementService>();
        services.AddScoped<IAgendaQueryService, AgendaQueryService>();
        services.AddScoped<IScheduleBrowseQueryService, ScheduleBrowseQueryService>();
        services.AddScoped<IScheduledEventManagementService, ScheduledEventManagementService>();
        services.AddScoped<IImportedScheduledEventSyncService, ImportedScheduledEventSyncService>();
        services.AddScoped<IGoogleCalendarIntegrationService, GoogleCalendarIntegrationService>();
        services.AddScoped<IEventReminderService, EventReminderService>();
        services.AddScoped<IChoreManagementService, ChoreService>();
        services.AddHttpClient<IGoogleCalendarFeedFetcher, GoogleCalendarFeedFetcher>();
        services.AddHttpClient<IGoogleOAuthClient, GoogleOAuthClient>();
        services.AddSingleton<IClock, SystemClock>();
        services.AddSingleton<IAuthorizationHandler, ActiveHouseholdOwnerHandler>();

        return services;
    }
}

public sealed class ActiveHouseholdOwnerRequirement : IAuthorizationRequirement;

public sealed class ActiveHouseholdOwnerHandler : AuthorizationHandler<ActiveHouseholdOwnerRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        ActiveHouseholdOwnerRequirement requirement)
    {
        if (string.Equals(
            context.User.FindFirst(SessionClaimTypes.HouseholdRole)?.Value,
            HouseholdRole.Owner.ToString(),
            StringComparison.Ordinal))
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}
