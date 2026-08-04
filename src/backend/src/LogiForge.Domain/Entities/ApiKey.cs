using LogiForge.Domain.Common;

namespace LogiForge.Domain.Entities;

public class ApiKey : TenantEntity, ITenantScoped
{
    public string Name { get; set; } = string.Empty;
    public string KeyHash { get; set; } = string.Empty;
    public string KeyPrefix { get; set; } = string.Empty;
    public string ScopesJson { get; set; } = "[]";
    public int RateLimitPerMinute { get; set; } = 60;
    public DateTime? ExpiresAt { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? LastUsedAt { get; set; }
}
