using FluentAssertions;
using LogiForge.Application.Inbound.Commands;
using LogiForge.Application.Inbound.Dtos;

namespace LogiForge.Application.Tests;

public class CreateInboundValidatorTests
{
    private readonly CreateInboundCommandValidator _validator = new();

    [Fact]
    public void Rejects_Empty_Lines()
    {
        var cmd = new CreateInboundCommand(new CreateInboundRequest(
            Guid.NewGuid(), Guid.NewGuid(), null, DateTime.UtcNow, null, null, null, []));
        var result = _validator.Validate(cmd);
        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Accepts_Valid_Payload()
    {
        var cmd = new CreateInboundCommand(new CreateInboundRequest(
            Guid.NewGuid(), Guid.NewGuid(), "Supplier", DateTime.UtcNow, "Carrier", "T1", null,
            [new CreateInboundLineRequest("MAT-1", "Widget", "B240501", 100, 10, 2, "P1", null, null)]));
        var result = _validator.Validate(cmd);
        result.IsValid.Should().BeTrue();
    }
}
