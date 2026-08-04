using FluentAssertions;

namespace LogiForge.Api.Tests;

public class HealthSmokeTests
{
    [Fact]
    public void Solution_Loads()
    {
        typeof(Program).Assembly.GetName().Name.Should().Be("LogiForge.Api");
    }
}
