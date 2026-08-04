using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using LogiForge.Application.Auth.Commands;
using LogiForge.Application.Auth.Dtos;
using LogiForge.Domain.Entities;
using LogiForge.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace LogiForge.Infrastructure.Identity;

public class AuthTokenService : IAuthTokenService
{
    private readonly IConfiguration _config;
    private readonly IRepository<AppUser> _users;
    private readonly Dictionary<string, (Guid UserId, DateTime Expires)> _refreshStore = new();

    public AuthTokenService(IConfiguration config, IRepository<AppUser> users)
    {
        _config = config;
        _users = users;
    }

    public (string AccessToken, string RefreshToken, DateTime ExpiresAt) IssueTokens(AppUser user, IEnumerable<string> permissions)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"] ?? "LogiForge_Dev_Signing_Key_ChangeMe_32chars!"));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expires = DateTime.UtcNow.AddMinutes(int.TryParse(_config["Jwt:ExpiryMinutes"], out var m) ? m : 60);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new("email", user.Email),
            new("name", user.DisplayName)
        };
        if (user.CompanyId is not null)
            claims.Add(new Claim("company_id", user.CompanyId.Value.ToString()));
        if (user.IsPlatformAdmin)
            claims.Add(new Claim(ClaimTypes.Role, "PlatformAdmin"));

        foreach (var p in permissions.Distinct())
            claims.Add(new Claim("permission", p));

        foreach (var wh in user.UserRoles.Where(ur => ur.WarehouseId is not null).Select(ur => ur.WarehouseId!.Value).Distinct())
            claims.Add(new Claim("warehouse_id", wh.ToString()));

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"] ?? "LogiForge",
            audience: _config["Jwt:Audience"] ?? "LogiForge",
            claims: claims,
            expires: expires,
            signingCredentials: creds);

        var access = new JwtSecurityTokenHandler().WriteToken(token);
        var refresh = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        _refreshStore[refresh] = (user.Id, DateTime.UtcNow.AddDays(7));
        return (access, refresh, expires);
    }

    public async Task<LoginResponse?> RefreshAsync(string refreshToken, CancellationToken ct = default)
    {
        if (!_refreshStore.TryGetValue(refreshToken, out var entry) || entry.Expires < DateTime.UtcNow)
            return null;

        var user = await _users.Query()
            .Include(u => u.Company)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role!).ThenInclude(r => r.RolePermissions).ThenInclude(rp => rp.Permission)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Warehouse)
            .FirstOrDefaultAsync(u => u.Id == entry.UserId, ct);
        if (user is null) return null;

        var permissions = user.IsPlatformAdmin
            ? Domain.Common.PermissionCodes.Catalog.Select(p => p.Code).ToList()
            : user.UserRoles.SelectMany(ur => ur.Role?.RolePermissions ?? [])
                .Select(rp => rp.Permission!.Code).Distinct().ToList();

        var (access, refresh, expires) = IssueTokens(user, permissions);
        _refreshStore.Remove(refreshToken);

        var warehouses = user.UserRoles.Where(ur => ur.Warehouse is not null)
            .Select(ur => new WarehouseOptionDto(ur.Warehouse!.Id, ur.Warehouse.Code, ur.Warehouse.Name))
            .DistinctBy(w => w.Id).ToList();

        return new LoginResponse(access, refresh, expires, new UserProfileDto(
            user.Id, user.Email, user.DisplayName, user.CompanyId, user.Company?.Name,
            user.IsPlatformAdmin, permissions, warehouses));
    }
}

public class BcryptPasswordHasher : IPasswordHasher
{
    public string Hash(string password) => BCrypt.Net.BCrypt.HashPassword(password);
    public bool Verify(string password, string hash) => BCrypt.Net.BCrypt.Verify(password, hash);
}
