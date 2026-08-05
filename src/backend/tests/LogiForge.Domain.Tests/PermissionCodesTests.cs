using FluentAssertions;
using LogiForge.Domain.Common;

namespace LogiForge.Domain.Tests;

public class PermissionCodesTests
{
    [Fact]
    public void Catalog_Contains_Core_Modules()
    {
        PermissionCodes.Catalog.Should().Contain(p => p.Code == PermissionCodes.InboundApprove);
        PermissionCodes.Catalog.Should().Contain(p => p.Code == PermissionCodes.OutboundShip);
        PermissionCodes.Catalog.Should().Contain(p => p.Code == PermissionCodes.InventoryView);
        PermissionCodes.Catalog.Select(p => p.Code).Should().OnlyHaveUniqueItems();
    }
}
