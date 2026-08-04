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

    public ICollection<Warehouse> Warehouses { get; set; } = new List<Warehouse>();
    public ICollection<AppUser> Users { get; set; } = new List<AppUser>();
}
