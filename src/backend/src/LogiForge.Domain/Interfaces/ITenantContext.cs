namespace LogiForge.Domain.Interfaces;

public interface ITenantContext
{
    Guid? CompanyId { get; }
    Guid? UserId { get; }
    bool IsPlatformAdmin { get; }
    IReadOnlyCollection<string> Permissions { get; }
    IReadOnlyCollection<Guid> WarehouseIds { get; }
    bool HasPermission(string permissionCode);
    bool CanAccessWarehouse(Guid warehouseId);
}
