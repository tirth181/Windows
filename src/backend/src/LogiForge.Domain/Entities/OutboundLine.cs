using LogiForge.Domain.Common;

namespace LogiForge.Domain.Entities;

public class OutboundLine : TenantEntity, ITenantScoped
{
    public Guid OutboundOrderId { get; set; }
    public Guid? InventoryItemId { get; set; }
    public string MaterialCode { get; set; } = string.Empty;
    public string BatchNumber { get; set; } = string.Empty;
    public decimal Weight { get; set; }
    public decimal Quantity { get; set; }
    public Guid? LocationId { get; set; }
    public int PalletCount { get; set; }
    public int BoxCount { get; set; }

    public OutboundOrder? OutboundOrder { get; set; }
    public InventoryItem? InventoryItem { get; set; }
}
