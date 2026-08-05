namespace LogiForge.Application.Auth.Dtos;

public record LoginRequest(string Email, string Password);
public record LoginResponse(string AccessToken, string RefreshToken, DateTime ExpiresAt, UserProfileDto User);

public record RegisterRequest(
    string CompanyName,
    string CompanyCode,
    string DisplayName,
    string Email,
    string Password);

public record RegisterResponse(
    Guid CompanyId,
    Guid UserId,
    string Email,
    bool EmailVerificationRequired,
    string Message,
    LoginResponse? Session);

public record VerifyEmailRequest(string Token);
public record ForgotPasswordRequest(string Email);
public record ResetPasswordRequest(string Token, string NewPassword);
public record MessageResponse(string Message);

public record UserProfileDto(
    Guid Id,
    string Email,
    string DisplayName,
    Guid? CompanyId,
    string? CompanyName,
    bool IsPlatformAdmin,
    IReadOnlyList<string> Permissions,
    IReadOnlyList<WarehouseOptionDto> Warehouses,
    bool EmailVerified = true,
    string? CompanyStatus = null,
    string? PlanCode = null,
    DateTime? TrialEndsAt = null);

public record WarehouseOptionDto(Guid Id, string Code, string Name);

public record BillingStatusDto(
    string CompanyStatus,
    string PlanCode,
    DateTime? TrialEndsAt,
    DateTime? CurrentPeriodEnd,
    string? BillingEmail,
    bool StripeConfigured,
    bool HasStripeCustomer,
    IReadOnlyList<SubscriptionPlanDto> Plans);

public record SubscriptionPlanDto(
    string Code,
    string Name,
    string Description,
    int PriceMonthlyCents,
    bool Available);

public record CreateCheckoutRequest(string PlanCode, string? SuccessUrl = null, string? CancelUrl = null);
public record CheckoutSessionResponse(string Url);
public record CreatePortalRequest(string? ReturnUrl = null);
public record PortalSessionResponse(string Url);
