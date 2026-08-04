using LogiForge.Domain.Common;
using LogiForge.Domain.Enums;

namespace LogiForge.Domain.Entities;

public class AppUser : EntityBase
{
    public Guid? CompanyId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? PasswordHash { get; set; }
    public AuthProvider AuthProvider { get; set; } = AuthProvider.Local;
    public string? EntraOid { get; set; }
    public bool MfaEnabled { get; set; }
    public string? MfaSecret { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsPlatformAdmin { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public int FailedLoginAttempts { get; set; }
    public DateTime? LockoutEnd { get; set; }
    public string? PasswordHistoryJson { get; set; }

    public Company? Company { get; set; }
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}
