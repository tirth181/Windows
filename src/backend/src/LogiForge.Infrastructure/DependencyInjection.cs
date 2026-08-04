using LogiForge.Application.Auth.Commands;
using LogiForge.Domain.Interfaces;
using LogiForge.Infrastructure.Caching;
using LogiForge.Infrastructure.Identity;
using LogiForge.Infrastructure.Persistence;
using LogiForge.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace LogiForge.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddHttpContextAccessor();
        services.AddScoped<ITenantContext, TenantContext>();
        services.AddScoped<ICurrentUserService, CurrentUserService>();

        services.AddDbContext<LogiForgeDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("DefaultConnection")
                              ?? "Host=localhost;Port=5432;Database=logiforge;Username=logiforge;Password=logiforge"));

        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IPasswordHasher, BcryptPasswordHasher>();
        services.AddScoped<IAuthTokenService, AuthTokenService>();
        services.AddScoped<IAuditService, AuditService>();
        services.AddScoped<IEmailService, EmailService>();
        services.AddScoped<IExcelExportService, ExcelExportService>();
        services.AddScoped<IDocumentNumberGenerator, DocumentNumberGenerator>();
        services.AddScoped<IAiAssistantService, PermissionAwareAiAssistantService>();
        services.AddScoped<ICacheService, RedisCacheService>();

        // Prefer Redis when explicitly enabled; otherwise in-memory distributed cache for local/dev.
        var redis = configuration.GetConnectionString("Redis");
        var useRedis = configuration.GetValue("Cache:UseRedis", false) && !string.IsNullOrWhiteSpace(redis);
        if (useRedis)
            services.AddStackExchangeRedisCache(o => o.Configuration = redis);
        else
            services.AddDistributedMemoryCache();

        return services;
    }
}
