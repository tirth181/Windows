namespace LogiForge.Application.Auth.Dtos;

public record LoginRequest(string Email, string Password);
public record LoginResponse(string AccessToken, string RefreshToken, DateTime ExpiresAt, UserProfileDto User);
public record UserProfileDto(
    Guid Id,
    string Email,
    string DisplayName,
    Guid? CompanyId,
    string? CompanyName,
    bool IsPlatformAdmin,
    IReadOnlyList<string> Permissions,
    IReadOnlyList<WarehouseOptionDto> Warehouses);
public record WarehouseOptionDto(Guid Id, string Code, string Name);
