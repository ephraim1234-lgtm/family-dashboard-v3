using System.Security.Claims;
using HouseholdOps.Infrastructure.Auth;
using HouseholdOps.Infrastructure.Households;
using HouseholdOps.Infrastructure.Options;
using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Modules.Households;
using HouseholdOps.Modules.Households.Contracts;
using HouseholdOps.Modules.Identity;
using HouseholdOps.Modules.Identity.Contracts;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Xunit;

namespace HouseholdOps.Modules.Households.Tests;

public class IdentityFoundationServiceTests
{
    [Fact]
    public async Task SignUpAsync_CreatesUserSessionThatNeedsOnboarding()
    {
        await using var dbContext = CreateDbContext();
        var harness = CreateHarness(dbContext);

        var result = await harness.IdentityAccessService.SignUpAsync(
            new SignUpRequest("owner@example.com", "password123", "Owner"),
            CancellationToken.None);

        Assert.Equal(IdentityCommandStatus.Succeeded, result.Status);
        var session = Assert.IsType<SessionResponse>(result.Session);
        var user = Assert.IsType<SessionUserResponse>(session.User);

        Assert.True(session.IsAuthenticated);
        Assert.False(session.HasActiveHousehold);
        Assert.True(session.NeedsOnboarding);
        Assert.Equal("owner@example.com", user.Email);
        Assert.Equal("Owner", user.DisplayName);

        var persistedUser = await dbContext.Users.SingleAsync();
        Assert.Equal("OWNER@EXAMPLE.COM", persistedUser.NormalizedEmail);
        Assert.NotEqual("password123", persistedUser.PasswordHash);

        var persistedSession = await dbContext.Sessions.SingleAsync();
        Assert.Equal(persistedUser.Id, persistedSession.UserId);
        Assert.Null(persistedSession.ActiveHouseholdId);

        Assert.Equal(
            persistedUser.Email,
            harness.Authentication.LastPrincipal?.FindFirst(ClaimTypes.Email)?.Value);
    }

    [Fact]
    public async Task LoginAsync_ThenSignOutAsync_PersistsAndRevokesSession()
    {
        await using var dbContext = CreateDbContext();
        var harness = CreateHarness(dbContext);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "member@example.com",
            NormalizedEmail = "MEMBER@EXAMPLE.COM",
            DisplayName = "Member",
            CreatedAtUtc = DateTimeOffset.UtcNow
        };
        user.PasswordHash = harness.PasswordHasher.HashPassword(user, "password123");

        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();

        var loginResult = await harness.IdentityAccessService.LoginAsync(
            new LoginRequest("member@example.com", "password123"),
            CancellationToken.None);

        Assert.Equal(IdentityCommandStatus.Succeeded, loginResult.Status);
        var session = await dbContext.Sessions.SingleAsync();
        Assert.Equal(user.Id, session.UserId);
        Assert.Null(session.RevokedAtUtc);
        Assert.NotNull(harness.Authentication.LastPrincipal);

        await harness.IdentityAccessService.SignOutAsync(CancellationToken.None);

        var revokedSession = await dbContext.Sessions.SingleAsync();
        Assert.NotNull(revokedSession.RevokedAtUtc);
        Assert.Equal(1, harness.Authentication.SignOutCount);
        Assert.Null(harness.Authentication.LastPrincipal);
    }

    [Fact]
    public async Task CreateAsync_CreatesOwnerMembershipAndSetsActiveHousehold()
    {
        await using var dbContext = CreateDbContext();
        var harness = CreateHarness(dbContext);

        var signUpResult = await harness.IdentityAccessService.SignUpAsync(
            new SignUpRequest("owner@example.com", "password123", "Owner"),
            CancellationToken.None);

        var userId = Guid.Parse(signUpResult.Session!.User!.UserId);
        var creationResult = await harness.HouseholdContextService.CreateAsync(
            new CreateHouseholdRequest("Rivera Household", "America/Chicago"),
            CancellationToken.None);

        Assert.Equal(HouseholdContextMutationStatus.Succeeded, creationResult.Status);
        var householdResponse = Assert.IsType<HouseholdContextResponse>(creationResult.Household);
        var householdId = Guid.Parse(householdResponse.HouseholdId);

        var household = await dbContext.Households.SingleAsync();
        Assert.Equal(householdId, household.Id);
        Assert.Equal(userId, household.CreatedByUserId);
        Assert.Equal("America/Chicago", household.TimeZoneId);

        var membership = await dbContext.Memberships.SingleAsync();
        Assert.Equal(householdId, membership.HouseholdId);
        Assert.Equal(userId, membership.UserId);
        Assert.Equal(HouseholdRole.Owner, membership.Role);

        var session = await dbContext.Sessions.SingleAsync();
        Assert.Equal(householdId, session.ActiveHouseholdId);
        Assert.Equal(
            householdId.ToString(),
            harness.Authentication.LastPrincipal?.FindFirst(SessionClaimTypes.HouseholdId)?.Value);
    }

    [Fact]
    public async Task AcceptAsync_CreatesMembershipAndCannotBeReused()
    {
        await using var dbContext = CreateDbContext();
        var harness = CreateHarness(dbContext);

        var ownerSignUp = await harness.IdentityAccessService.SignUpAsync(
            new SignUpRequest("owner@example.com", "password123", "Owner"),
            CancellationToken.None);

        var ownerId = Guid.Parse(ownerSignUp.Session!.User!.UserId);
        var householdCreation = await harness.HouseholdContextService.CreateAsync(
            new CreateHouseholdRequest("Rivera Household", "UTC"),
            CancellationToken.None);
        var householdId = Guid.Parse(householdCreation.Household!.HouseholdId);

        var inviteCreation = await harness.HouseholdInviteService.CreateAsync(
            householdId,
            ownerId,
            new CreateHouseholdInviteRequest("member@example.com", "Member"),
            "http://localhost/invite",
            new DateTimeOffset(2026, 4, 22, 12, 0, 0, TimeSpan.Zero),
            CancellationToken.None);

        var acceptUrl = Assert.IsType<CreateHouseholdInviteResponse>(inviteCreation.CreatedInvite).AcceptUrl;
        var inviteToken = ExtractInviteToken(acceptUrl);

        await harness.IdentityAccessService.SignOutAsync(CancellationToken.None);

        var memberSignUp = await harness.IdentityAccessService.SignUpAsync(
            new SignUpRequest("member@example.com", "password123", "Member"),
            CancellationToken.None);

        var memberId = Guid.Parse(memberSignUp.Session!.User!.UserId);
        var acceptResult = await harness.HouseholdInviteService.AcceptAsync(
            memberId,
            inviteToken,
            new DateTimeOffset(2026, 4, 22, 12, 5, 0, TimeSpan.Zero),
            CancellationToken.None);

        Assert.Equal(HouseholdInviteMutationStatus.Accepted, acceptResult.Status);

        var acceptedMembership = await dbContext.Memberships.SingleAsync(item => item.UserId == memberId);
        Assert.Equal(householdId, acceptedMembership.HouseholdId);
        Assert.Equal(HouseholdRole.Member, acceptedMembership.Role);

        var activeSession = await dbContext.Sessions
            .SingleAsync(item => item.UserId == memberId && item.RevokedAtUtc == null);
        Assert.Equal(householdId, activeSession.ActiveHouseholdId);

        var secondAccept = await harness.HouseholdInviteService.AcceptAsync(
            memberId,
            inviteToken,
            new DateTimeOffset(2026, 4, 22, 12, 6, 0, TimeSpan.Zero),
            CancellationToken.None);

        Assert.Equal(HouseholdInviteMutationStatus.NotFound, secondAccept.Status);
    }

    [Fact]
    public async Task AcceptAsync_RejectsInviteForDifferentEmail()
    {
        await using var dbContext = CreateDbContext();
        var harness = CreateHarness(dbContext);

        var ownerSignUp = await harness.IdentityAccessService.SignUpAsync(
            new SignUpRequest("owner@example.com", "password123", "Owner"),
            CancellationToken.None);

        var ownerId = Guid.Parse(ownerSignUp.Session!.User!.UserId);
        var householdCreation = await harness.HouseholdContextService.CreateAsync(
            new CreateHouseholdRequest("Rivera Household", "UTC"),
            CancellationToken.None);
        var householdId = Guid.Parse(householdCreation.Household!.HouseholdId);

        var inviteCreation = await harness.HouseholdInviteService.CreateAsync(
            householdId,
            ownerId,
            new CreateHouseholdInviteRequest("member@example.com", "Member"),
            "http://localhost/invite",
            new DateTimeOffset(2026, 4, 22, 12, 0, 0, TimeSpan.Zero),
            CancellationToken.None);

        var inviteToken = ExtractInviteToken(
            Assert.IsType<CreateHouseholdInviteResponse>(inviteCreation.CreatedInvite).AcceptUrl);

        await harness.IdentityAccessService.SignOutAsync(CancellationToken.None);

        var otherSignUp = await harness.IdentityAccessService.SignUpAsync(
            new SignUpRequest("other@example.com", "password123", "Other"),
            CancellationToken.None);

        var otherUserId = Guid.Parse(otherSignUp.Session!.User!.UserId);
        var acceptResult = await harness.HouseholdInviteService.AcceptAsync(
            otherUserId,
            inviteToken,
            new DateTimeOffset(2026, 4, 22, 12, 5, 0, TimeSpan.Zero),
            CancellationToken.None);

        Assert.Equal(HouseholdInviteMutationStatus.Conflict, acceptResult.Status);
        Assert.Equal(
            "This invite does not match the signed-in account email.",
            acceptResult.Error);
        Assert.False(await dbContext.Memberships.AnyAsync(item => item.UserId == otherUserId));
    }

    private static string ExtractInviteToken(string acceptUrl)
    {
        var tokenMarker = "token=";
        var index = acceptUrl.IndexOf(tokenMarker, StringComparison.Ordinal);
        return index >= 0
            ? acceptUrl[(index + tokenMarker.Length)..]
            : string.Empty;
    }

    private static HouseholdOpsDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<HouseholdOpsDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options;

        return new HouseholdOpsDbContext(options);
    }

    private static TestHarness CreateHarness(HouseholdOpsDbContext dbContext)
    {
        var authentication = new FakeAuthenticationService();
        var services = new ServiceCollection()
            .AddSingleton<IAuthenticationService>(authentication)
            .BuildServiceProvider();

        var httpContext = new DefaultHttpContext
        {
            RequestServices = services,
            User = new ClaimsPrincipal(new ClaimsIdentity())
        };

        var httpContextAccessor = new HttpContextAccessor
        {
            HttpContext = httpContext
        };

        var passwordHasher = new PasswordHasher<User>();
        var identityAccessService = new IdentityAccessService(
            httpContextAccessor,
            dbContext,
            passwordHasher,
            Options.Create(new AuthOptions()));

        return new TestHarness(
            passwordHasher,
            authentication,
            identityAccessService,
            new HouseholdContextService(dbContext, identityAccessService),
            new HouseholdInviteService(dbContext, identityAccessService));
    }

    private sealed record TestHarness(
        IPasswordHasher<User> PasswordHasher,
        FakeAuthenticationService Authentication,
        IdentityAccessService IdentityAccessService,
        HouseholdContextService HouseholdContextService,
        HouseholdInviteService HouseholdInviteService);

    private sealed class FakeAuthenticationService : IAuthenticationService
    {
        public ClaimsPrincipal? LastPrincipal { get; private set; }

        public int SignOutCount { get; private set; }

        public Task<AuthenticateResult> AuthenticateAsync(HttpContext context, string? scheme) =>
            Task.FromResult(AuthenticateResult.NoResult());

        public Task ChallengeAsync(HttpContext context, string? scheme, AuthenticationProperties? properties) =>
            Task.CompletedTask;

        public Task ForbidAsync(HttpContext context, string? scheme, AuthenticationProperties? properties) =>
            Task.CompletedTask;

        public Task SignInAsync(
            HttpContext context,
            string? scheme,
            ClaimsPrincipal principal,
            AuthenticationProperties? properties)
        {
            LastPrincipal = principal;
            context.User = principal;
            return Task.CompletedTask;
        }

        public Task SignOutAsync(HttpContext context, string? scheme, AuthenticationProperties? properties)
        {
            SignOutCount++;
            LastPrincipal = null;
            context.User = new ClaimsPrincipal(new ClaimsIdentity());
            return Task.CompletedTask;
        }
    }
}
