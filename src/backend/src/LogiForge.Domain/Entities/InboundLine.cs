using LogiForge.Domain.Common;
using LogiForge.Domain.Enums;

namespace LogiForge.Domain.Entities;

public class InboundLine : TenantEntity, ITenantScoped
{
    public Guid InboundLoadId { get; set; }
    public int LineNumber { get; set; }
    public string MaterialCode { get; set; } = string.Empty;
    public string MaterialDescription { get; set; } = string.Empty;
    public string BatchNumber { get; set; } = string.Empty;
    public decimal Weight { get; set; }
    public decimal Quantity { get; set; }
    public int BoxCount { get; set; }
    public string? PalletId { get; set; }
    public Guid? PutawayLocationId { get; set; }
    public InventoryStatus Status { get; set; } = InventoryStatus.Available;
    public string? Comments { get; set; }

    public InboundLoad? InboundLoad { get; set; }
    public StorageLocation? PutawayLocation { get; set; }
}
