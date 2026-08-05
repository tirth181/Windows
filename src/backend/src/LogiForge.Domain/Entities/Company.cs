using LogiForge.Domain.Common;
using LogiForge.Domain.Enums;

namespace LogiForge.Domain.Entities;

public class Company : EntityBase
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public CompanyStatus Status { get; set; } = CompanyStatus.Trial;
    public string? BrandingJson { get; set; }
    public string? SettingsJson { get; set; }

    /// <summary>When the free trial ends (UTC). Null for grandfathered / manually activated tenants.</summary>
    public DateTime? TrialEndsAt { get; set; }
    public string PlanCode { get; set; } = "trial";
    public string? StripeCustomerId { get; set; }
    public string? StripeSubscriptionId { get; set; }
    public string? StripePriceId { get; set; }
    public DateTime? CurrentPeriodEnd { get; set; }
    public string? BillingEmail { get; set; }

    public ICollection<Warehouse> Warehouses { get; set; } = new List<Warehouse>();
    public ICollection<AppUser> Users { get; set; } = new List<AppUser>();
}
