using LogiForge.Domain.Common;

namespace LogiForge.Domain.Entities;

public class StorageLocation : TenantEntity, ITenantScoped
{
    public Guid WarehouseId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string? Zone { get; set; }
    public string? Aisle { get; set; }
    public string? Rack { get; set; }
    public string? Bin { get; set; }
    public string LocationType { get; set; } = "Storage";
    public decimal? CapacityWeight { get; set; }
    public bool IsActive { get; set; } = true;

    public Warehouse? Warehouse { get; set; }
}
