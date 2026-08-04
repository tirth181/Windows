using LogiForge.Application.Auth.Commands;

namespace LogiForge.Application.Tests;

public class LoginLockoutTests
{
    [Fact]
    public void Lockout_policy_matches_security_model()
    {
        Assert.Equal(5, LoginCommandHandler.MaxFailedAttempts);
        Assert.Equal(TimeSpan.FromMinutes(15), LoginCommandHandler.LockoutDuration);
    }
}
