using LogiForge.Domain.Common;
using LogiForge.Domain.Enums;

namespace LogiForge.Domain.Entities;

public class InventoryItem : TenantEntity, ITenantScoped
{
    public Guid WarehouseId { get; set; }
    public Guid CustomerId { get; set; }
    public string MaterialCode { get; set; } = string.Empty;
    public string MaterialDescription { get; set; } = string.Empty;
    public string BatchNumber { get; set; } = string.Empty;
    public string? PalletId { get; set; }
    public Guid? LocationId { get; set; }
    public decimal OriginalWeight { get; set; }
    public decimal RemainingWeight { get; set; }
    public decimal Quantity { get; set; }
    public int BoxCount { get; set; }
    public InventoryStatus Status { get; set; } = InventoryStatus.Available;
    public Guid? InboundLineId { get; set; }
    public DateTime LastUpdatedAt { get; set; } = DateTime.UtcNow;

    public Warehouse? Warehouse { get; set; }
    public Customer? Customer { get; set; }
    public StorageLocation? Location { get; set; }
}
