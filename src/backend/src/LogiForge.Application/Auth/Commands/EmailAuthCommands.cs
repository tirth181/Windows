using System.Security.Cryptography;
using LogiForge.Application.Auth.Dtos;
using LogiForge.Application.Common;
using LogiForge.Domain.Entities;
using LogiForge.Domain.Exceptions;
using LogiForge.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace LogiForge.Application.Auth.Commands;

public record VerifyEmailCommand(string Token) : IRequest<MessageResponse>;
public record ForgotPasswordCommand(string Email) : IRequest<MessageResponse>;
public record ResetPasswordCommand(string Token, string NewPassword) : IRequest<MessageResponse>;

public class VerifyEmailCommandHandler : IRequestHandler<VerifyEmailCommand, MessageResponse>
{
    private readonly IRepository<AppUser> _users;
    private readonly IUnitOfWork _uow;

    public VerifyEmailCommandHandler(IRepository<AppUser> users, IUnitOfWork uow)
    {
        _users = users;
        _uow = uow;
    }

    public async Task<MessageResponse> Handle(VerifyEmailCommand request, CancellationToken cancellationToken)
    {
        var token = (request.Token ?? "").Trim();
        if (string.IsNullOrEmpty(token))
            throw new DomainException("invalid_token", "Verification token is missing.");

        var user = await _users.Query().IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.EmailVerificationToken == token && !u.IsDeleted, cancellationToken)
            ?? throw new DomainException("invalid_token", "This verification link is invalid or already used.");

        if (user.EmailVerificationExpiresAt is not null && user.EmailVerificationExpiresAt < DateTime.UtcNow)
            throw new DomainException("token_expired", "This verification link has expired. Register again or contact support.");

        user.EmailVerified = true;
        user.EmailVerificationToken = null;
        user.EmailVerificationExpiresAt = null;
        _users.Update(user);
        await _uow.SaveChangesAsync(cancellationToken);
        return new MessageResponse("Email verified. You can sign in now.");
    }
}

public class ForgotPasswordCommandHandler : IRequestHandler<ForgotPasswordCommand, MessageResponse>
{
    private readonly IRepository<AppUser> _users;
    private readonly IUnitOfWork _uow;
    private readonly IEmailService _email;
    private readonly AppOptions _app;

    public ForgotPasswordCommandHandler(
        IRepository<AppUser> users,
        IUnitOfWork uow,
        IEmailService email,
        IOptions<AppOptions> app)
    {
        _users = users;
        _uow = uow;
        _email = email;
        _app = app.Value;
    }

    public async Task<MessageResponse> Handle(ForgotPasswordCommand request, CancellationToken cancellationToken)
    {
        // Always return the same message to avoid account enumeration.
        const string ok = "If an account exists for that email, a reset link has been sent.";
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _users.Query().IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted && u.IsActive, cancellationToken);

        if (user is null || string.IsNullOrEmpty(user.PasswordHash))
            return new MessageResponse(ok);

        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        user.PasswordResetToken = token;
        user.PasswordResetExpiresAt = DateTime.UtcNow.AddHours(2);
        _users.Update(user);
        await _uow.SaveChangesAsync(cancellationToken);

        var link = $"{_app.PublicWebBaseUrl.TrimEnd('/')}/reset-password?token={Uri.EscapeDataString(token)}";
        await _email.SendNowAsync(
            user.CompanyId ?? Guid.Empty,
            "auth.reset",
            email,
            "Reset your LogiForge password",
            $"""
            <p>We received a request to reset your password.</p>
            <p><a href="{link}">Choose a new password</a></p>
            <p>This link expires in 2 hours. If you did not request it, you can ignore this email.</p>
            """,
            cancellationToken);

        return new MessageResponse(ok);
    }
}

public class ResetPasswordCommandHandler : IRequestHandler<ResetPasswordCommand, MessageResponse>
{
    private readonly IRepository<AppUser> _users;
    private readonly IUnitOfWork _uow;
    private readonly IPasswordHasher _hasher;

    public ResetPasswordCommandHandler(IRepository<AppUser> users, IUnitOfWork uow, IPasswordHasher hasher)
    {
        _users = users;
        _uow = uow;
        _hasher = hasher;
    }

    public async Task<MessageResponse> Handle(ResetPasswordCommand request, CancellationToken cancellationToken)
    {
        var token = (request.Token ?? "").Trim();
        if (string.IsNullOrEmpty(token))
            throw new DomainException("invalid_token", "Reset token is missing.");
        if (string.IsNullOrEmpty(request.NewPassword) || request.NewPassword.Length < 12)
            throw new DomainException("password_policy", "Password must be at least 12 characters.");

        var user = await _users.Query().IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.PasswordResetToken == token && !u.IsDeleted, cancellationToken)
            ?? throw new DomainException("invalid_token", "This reset link is invalid or already used.");

        if (user.PasswordResetExpiresAt is null || user.PasswordResetExpiresAt < DateTime.UtcNow)
            throw new DomainException("token_expired", "This reset link has expired. Request a new one.");

        user.PasswordHash = _hasher.Hash(request.NewPassword);
        user.PasswordResetToken = null;
        user.PasswordResetExpiresAt = null;
        user.FailedLoginAttempts = 0;
        user.LockoutEnd = null;
        user.EmailVerified = true; // prove inbox access
        _users.Update(user);
        await _uow.SaveChangesAsync(cancellationToken);
        return new MessageResponse("Password updated. You can sign in with your new password.");
    }
}
