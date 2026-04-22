using HouseholdOps.Modules.Households.Contracts;
using HouseholdOps.Modules.Identity;
using HouseholdOps.SharedKernel.Time;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace HouseholdOps.Modules.Households;

public static class DependencyInjection
{
    public static IServiceCollection AddHouseholdsModule(this IServiceCollection services) => services;

    public static IEndpointRouteBuilder MapHouseholdsModule(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/households");

        group.MapPost("/onboarding", async (
            CreateHouseholdRequest? request,
            IHouseholdContextService service,
            CancellationToken cancellationToken) =>
        {
            if (request is null)
            {
                return Results.BadRequest("Request body is required.");
            }

            var result = await service.CreateAsync(request, cancellationToken);
            return result.Status switch
            {
                HouseholdContextMutationStatus.Succeeded => Results.Ok(result.Household),
                HouseholdContextMutationStatus.ValidationFailed => Results.BadRequest(result.Error),
                HouseholdContextMutationStatus.Conflict => Results.Conflict(result.Error),
                _ => Results.Unauthorized()
            };
        }).RequireAuthorization();

        group.MapGet("/current", async (
            IHouseholdContextService service,
            CancellationToken cancellationToken) =>
        {
            var householdContext = await service.GetCurrentAsync(cancellationToken);

            if (householdContext is null)
            {
                return Results.Forbid();
            }

            return Results.Ok(householdContext);
        }).RequireAuthorization();

        group.MapPatch("/current/name", async (
            RenameHouseholdRequest? request,
            IHouseholdContextService service,
            CancellationToken cancellationToken) =>
        {
            if (request is null || string.IsNullOrWhiteSpace(request.Name))
            {
                return Results.BadRequest("Name is required.");
            }

            var result = await service.RenameAsync(request.Name, cancellationToken);

            if (result is null)
            {
                return Results.Unauthorized();
            }

            return Results.Ok(result);
        }).RequireAuthorization("ActiveHouseholdOwner");

        group.MapPatch("/current/time-zone", async (
            UpdateHouseholdTimeZoneRequest? request,
            IHouseholdContextService service,
            CancellationToken cancellationToken) =>
        {
            if (request is null)
            {
                return Results.BadRequest("Request body is required.");
            }

            var result = await service.UpdateTimeZoneAsync(
                request.TimeZoneId,
                cancellationToken);

            return result.Status switch
            {
                HouseholdTimeZoneUpdateStatus.Succeeded => Results.Ok(result.Household),
                HouseholdTimeZoneUpdateStatus.ValidationFailed => Results.BadRequest(result.Error),
                HouseholdTimeZoneUpdateStatus.Unauthorized => Results.Unauthorized(),
                _ => Results.BadRequest("Unable to update time zone.")
            };
        }).RequireAuthorization("ActiveHouseholdOwner");

        group.MapGet("/members", async (
            IIdentityAccessService identityAccessService,
            IHouseholdMemberService memberService,
            CancellationToken cancellationToken) =>
        {
            var access = identityAccessService.GetCurrentAccess();

            if (!access.ActiveHouseholdId.HasValue)
            {
                return Results.Forbid();
            }

            var result = await memberService.ListMembersAsync(access.ActiveHouseholdId.Value, cancellationToken);

            return Results.Ok(result);
        }).RequireAuthorization("ActiveHouseholdOwner");

        group.MapGet("/invites", async (
            IIdentityAccessService identityAccessService,
            IHouseholdInviteService inviteService,
            CancellationToken cancellationToken) =>
        {
            var access = identityAccessService.GetCurrentAccess();
            if (!access.ActiveHouseholdId.HasValue)
            {
                return Results.Forbid();
            }

            var result = await inviteService.ListAsync(access.ActiveHouseholdId.Value, cancellationToken);
            return Results.Ok(result);
        }).RequireAuthorization("ActiveHouseholdOwner");

        group.MapPost("/invites", async (
            CreateHouseholdInviteRequest? request,
            HttpRequest httpRequest,
            IIdentityAccessService identityAccessService,
            IHouseholdInviteService inviteService,
            IConfiguration configuration,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            if (request is null)
            {
                return Results.BadRequest("Request body is required.");
            }

            var access = identityAccessService.GetCurrentAccess();
            if (!access.ActiveHouseholdId.HasValue || !access.UserId.HasValue)
            {
                return Results.Forbid();
            }

            var acceptUrlBase = ResolveInviteBaseUrl(
                httpRequest,
                configuration["AppUrls:WebPublicBaseUrl"]);
            var result = await inviteService.CreateAsync(
                access.ActiveHouseholdId.Value,
                access.UserId.Value,
                request,
                acceptUrlBase,
                clock.UtcNow,
                cancellationToken);

            return result.Status switch
            {
                HouseholdInviteMutationStatus.Created => Results.Ok(result.CreatedInvite),
                HouseholdInviteMutationStatus.ValidationFailed => Results.BadRequest(result.Error),
                HouseholdInviteMutationStatus.Conflict => Results.Conflict(result.Error),
                _ => Results.BadRequest("Unable to create invite.")
            };
        }).RequireAuthorization("ActiveHouseholdOwner");

        group.MapDelete("/invites/{inviteId:guid}", async (
            Guid inviteId,
            IIdentityAccessService identityAccessService,
            IHouseholdInviteService inviteService,
            CancellationToken cancellationToken) =>
        {
            var access = identityAccessService.GetCurrentAccess();
            if (!access.ActiveHouseholdId.HasValue)
            {
                return Results.Forbid();
            }

            var result = await inviteService.RevokeAsync(
                access.ActiveHouseholdId.Value,
                inviteId,
                cancellationToken);

            return result.Status switch
            {
                HouseholdInviteMutationStatus.Deleted => Results.NoContent(),
                HouseholdInviteMutationStatus.NotFound => Results.NotFound(),
                _ => Results.BadRequest("Unable to revoke invite.")
            };
        }).RequireAuthorization("ActiveHouseholdOwner");

        group.MapDelete("/members/{membershipId:guid}", async (
            Guid membershipId,
            IIdentityAccessService identityAccessService,
            IHouseholdMemberService memberService,
            CancellationToken cancellationToken) =>
        {
            var access = identityAccessService.GetCurrentAccess();
            if (!access.ActiveHouseholdId.HasValue)
            {
                return Results.Forbid();
            }

            var result = await memberService.RemoveMemberAsync(
                access.ActiveHouseholdId.Value,
                membershipId,
                cancellationToken);

            return result.Status switch
            {
                HouseholdMemberMutationStatus.Deleted => Results.NoContent(),
                HouseholdMemberMutationStatus.Conflict => Results.Conflict(result.Error),
                HouseholdMemberMutationStatus.NotFound => Results.NotFound(),
                _ => Results.BadRequest("Unable to remove member.")
            };
        }).RequireAuthorization("ActiveHouseholdOwner");

        app.MapGet("/api/household-invites/{token}/preview", async (
            string token,
            IHouseholdInviteService inviteService,
            CancellationToken cancellationToken) =>
        {
            if (string.IsNullOrWhiteSpace(token))
            {
                return Results.BadRequest("Invite token is required.");
            }

            var preview = await inviteService.PreviewAsync(token, cancellationToken);
            return preview is null ? Results.NotFound() : Results.Ok(preview);
        });

        app.MapPost("/api/household-invites/accept", async (
            AcceptHouseholdInviteRequest? request,
            IIdentityAccessService identityAccessService,
            IHouseholdInviteService inviteService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            if (request is null || string.IsNullOrWhiteSpace(request.Token))
            {
                return Results.BadRequest("Invite token is required.");
            }

            var access = identityAccessService.GetCurrentAccess();
            if (!access.UserId.HasValue)
            {
                return Results.Unauthorized();
            }

            var result = await inviteService.AcceptAsync(
                access.UserId.Value,
                request.Token,
                clock.UtcNow,
                cancellationToken);

            return result.Status switch
            {
                HouseholdInviteMutationStatus.Accepted => Results.Ok(result.Household),
                HouseholdInviteMutationStatus.ValidationFailed => Results.BadRequest(result.Error),
                HouseholdInviteMutationStatus.Conflict => Results.Conflict(result.Error),
                HouseholdInviteMutationStatus.NotFound => Results.NotFound(),
                HouseholdInviteMutationStatus.Unauthorized => Results.Unauthorized(),
                _ => Results.BadRequest("Unable to accept invite.")
            };
        }).RequireAuthorization();

        var appGroup = app.MapGroup("/api/app")
            .RequireAuthorization();

        appGroup.MapGet("/activity", async (
            IIdentityAccessService identityAccessService,
            IActivityFeedService activityFeedService,
            CancellationToken cancellationToken) =>
        {
            var access = identityAccessService.GetCurrentAccess();
            if (!access.ActiveHouseholdId.HasValue)
            {
                return Results.Forbid();
            }

            var result = await activityFeedService.GetRecentActivityAsync(access.ActiveHouseholdId.Value, cancellationToken);
            return Results.Ok(result);
        });

        appGroup.MapGet("/today", async (
            IIdentityAccessService identityAccessService,
            IHouseholdTodayService todayService,
            CancellationToken cancellationToken) =>
        {
            var access = identityAccessService.GetCurrentAccess();
            if (!access.ActiveHouseholdId.HasValue)
            {
                return Results.Forbid();
            }

            var result = await todayService.GetTodayAsync(access.ActiveHouseholdId.Value, cancellationToken);
            return Results.Ok(result);
        });

        appGroup.MapGet("/home", async (
            IIdentityAccessService identityAccessService,
            IHouseholdHomeService homeService,
            CancellationToken cancellationToken) =>
        {
            var access = identityAccessService.GetCurrentAccess();
            if (!access.ActiveHouseholdId.HasValue)
            {
                return Results.Forbid();
            }

            var result = await homeService.GetHomeAsync(
                access.ActiveHouseholdId.Value,
                access.IsOwner,
                cancellationToken);
            return Results.Ok(result);
        });

        return app;
    }

    private static string ResolveInviteBaseUrl(
        HttpRequest httpRequest,
        string? configuredWebPublicBaseUrl)
    {
        var configuredWebBaseUrl = NormalizeAbsoluteHttpUrl(configuredWebPublicBaseUrl);
        if (!string.IsNullOrWhiteSpace(configuredWebBaseUrl))
        {
            return $"{configuredWebBaseUrl}/invite";
        }

        return $"{httpRequest.Scheme}://{httpRequest.Host}/invite";
    }

    private static string? NormalizeAbsoluteHttpUrl(string? url)
    {
        var configuredValue = url?.Trim();
        if (string.IsNullOrWhiteSpace(configuredValue))
        {
            return null;
        }

        if (!Uri.TryCreate(configuredValue, UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            throw new InvalidOperationException(
                "AppUrls:WebPublicBaseUrl must be an absolute http or https URL.");
        }

        var builder = new UriBuilder(uri)
        {
            Query = string.Empty,
            Fragment = string.Empty
        };

        return builder.Uri.ToString().TrimEnd('/');
    }
}
