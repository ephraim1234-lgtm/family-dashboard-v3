using HouseholdOps.Modules.Identity.Contracts;

namespace HouseholdOps.Modules.Identity;

public interface IIdentityAccessService
{
    SessionResponse GetCurrentSession();

    Task<SessionResponse?> SignInDevelopmentAsync(CancellationToken cancellationToken);

    Task SignOutAsync(CancellationToken cancellationToken);
}

