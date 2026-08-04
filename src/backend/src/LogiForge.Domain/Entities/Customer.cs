using LogiForge.Domain.Common;

namespace LogiForge.Domain.Entities;

public class Customer : TenantEntity, ITenantScoped
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ContactJson { get; set; }
    public string? BillingJson { get; set; }
    public bool IsActive { get; set; } = true;
}
