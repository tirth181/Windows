using LogiForge.Domain.Common;
using LogiForge.Domain.Enums;

namespace LogiForge.Domain.Entities;

public class InventoryTransaction : TenantEntity, ITenantScoped
{
    public Guid InventoryItemId { get; set; }
    public InventoryTransactionType TransactionType { get; set; }
    public decimal QuantityDelta { get; set; }
    public decimal WeightDelta { get; set; }
    public string? ReferenceType { get; set; }
    public Guid? ReferenceId { get; set; }
    public string? Notes { get; set; }

    public InventoryItem? InventoryItem { get; set; }
}
