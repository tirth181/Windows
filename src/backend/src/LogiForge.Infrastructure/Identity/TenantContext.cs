using System.Security.Claims;
using LogiForge.Domain.Common;
using LogiForge.Domain.Interfaces;
using Microsoft.AspNetCore.Http;

namespace LogiForge.Infrastructure.Identity;

public class TenantContext : ITenantContext
{
    private readonly IHttpContextAccessor _http;

    public TenantContext(IHttpContextAccessor http) => _http = http;

    private ClaimsPrincipal? User => _http.HttpContext?.User;

    public Guid? CompanyId
    {
        get
        {
            var v = User?.FindFirstValue("company_id");
            return Guid.TryParse(v, out var id) ? id : null;
        }
    }

    public Guid? UserId
    {
        get
        {
            var v = User?.FindFirstValue(ClaimTypes.NameIdentifier) ?? User?.FindFirstValue("sub");
            return Guid.TryParse(v, out var id) ? id : null;
        }
    }

    public bool IsPlatformAdmin =>
        User?.HasClaim("permission", PermissionCodes.PlatformAdmin) == true ||
        User?.IsInRole("PlatformAdmin") == true;

    public IReadOnlyCollection<string> Permissions =>
        User?.FindAll("permission").Select(c => c.Value).Distinct().ToList()
        ?? (IReadOnlyCollection<string>)Array.Empty<string>();

    public IReadOnlyCollection<Guid> WarehouseIds =>
        User?.FindAll("warehouse_id")
            .Select(c => Guid.TryParse(c.Value, out var id) ? id : Guid.Empty)
            .Where(id => id != Guid.Empty)
            .Distinct()
            .ToList()
        ?? (IReadOnlyCollection<Guid>)Array.Empty<Guid>();

    public bool HasPermission(string permissionCode) =>
        IsPlatformAdmin ||
        Permissions.Contains(PermissionCodes.AdminFull) ||
        Permissions.Contains(permissionCode);

    public bool CanAccessWarehouse(Guid warehouseId) =>
        IsPlatformAdmin ||
        WarehouseIds.Count == 0 ||
        WarehouseIds.Contains(warehouseId);
}

public class CurrentUserService : ICurrentUserService
{
    private readonly ITenantContext _tenant;
    private readonly IHttpContextAccessor _http;

    public CurrentUserService(ITenantContext tenant, IHttpContextAccessor http)
    {
        _tenant = tenant;
        _http = http;
    }

    public Guid? UserId => _tenant.UserId;
    public Guid? CompanyId => _tenant.CompanyId;
    public string? Email => _http.HttpContext?.User?.FindFirstValue(ClaimTypes.Email)
                            ?? _http.HttpContext?.User?.FindFirstValue("email");
    public bool IsAuthenticated => _http.HttpContext?.User?.Identity?.IsAuthenticated == true;
    public bool IsPlatformAdmin => _tenant.IsPlatformAdmin;
    public IReadOnlyCollection<string> Permissions => _tenant.Permissions;
}
