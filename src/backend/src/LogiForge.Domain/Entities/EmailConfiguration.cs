using LogiForge.Domain.Common;
using LogiForge.Domain.Enums;

namespace LogiForge.Domain.Entities;

public class EmailConfiguration : TenantEntity, ITenantScoped
{
    public EmailProvider Provider { get; set; } = EmailProvider.Smtp;
    public string SettingsJson { get; set; } = "{}";
    public string? DistributionListsJson { get; set; }
    public bool IsActive { get; set; } = true;
}
