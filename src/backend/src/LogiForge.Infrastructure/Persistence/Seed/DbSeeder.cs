using LogiForge.Domain.Common;
using LogiForge.Domain.Entities;
using LogiForge.Domain.Enums;
using LogiForge.Application.Auth.Commands;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace LogiForge.Infrastructure.Persistence.Seed;

public static class DbSeeder
{
    public static async Task SeedAsync(IServiceProvider sp)
    {
        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LogiForgeDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DbSeeder");

        await db.Database.EnsureCreatedAsync();
        await EnsureSchemaPatchesAsync(db, logger);

        if (!await db.Permissions.AnyAsync())
        {
            foreach (var p in PermissionCodes.Catalog)
            {
                db.Permissions.Add(new Permission
                {
                    Module = p.Module,
                    Action = p.Action,
                    Code = p.Code,
                    Description = p.Description
                });
            }
            await db.SaveChangesAsync();
            logger.LogInformation("Seeded permissions");
        }

        if (await db.Companies.IgnoreQueryFilters().AnyAsync()) return;

        var company = new Company
        {
            Name = "Harborline Logistics",
            Code = "HARBOR",
            Status = CompanyStatus.Active,
            PlanCode = "growth",
            BillingEmail = "admin@harborline.com",
            BrandingJson = """{"primary":"#0B1F33","accent":"#D97706"}"""
        };
        db.Companies.Add(company);

        var wh = new Warehouse
        {
            CompanyId = company.Id,
            Code = "HARBOR",
            Name = "Harborline Logistics",
            Timezone = "America/Chicago",
            IsActive = true
        };
        db.Warehouses.Add(wh);

        var perms = await db.Permissions.ToListAsync();
        var adminRole = new Role { CompanyId = company.Id, Name = "Company Administrator", IsSystem = true, Description = "Full company access" };
        var floorRole = new Role { CompanyId = company.Id, Name = "3PL Company Associate", IsSystem = true, Description = "Floor receiving and shipping" };
        db.Roles.AddRange(adminRole, floorRole);

        foreach (var p in perms.Where(p => p.Code != PermissionCodes.PlatformAdmin))
            adminRole.RolePermissions.Add(new RolePermission { RoleId = adminRole.Id, PermissionId = p.Id });

        foreach (var code in new[] { PermissionCodes.DashboardView, PermissionCodes.InboundView, PermissionCodes.InboundCreate, PermissionCodes.InboundApprove,
                     PermissionCodes.InventoryView, PermissionCodes.OutboundView, PermissionCodes.OutboundCreate, PermissionCodes.OutboundShip, PermissionCodes.AiUse })
        {
            var p = perms.First(x => x.Code == code);
            floorRole.RolePermissions.Add(new RolePermission { RoleId = floorRole.Id, PermissionId = p.Id });
        }

        var admin = new AppUser
        {
            CompanyId = company.Id,
            Email = "admin@harborline.com",
            DisplayName = "Alex Admin",
            PasswordHash = hasher.Hash("ChangeMe!Harbor12"),
            AuthProvider = AuthProvider.Local,
            IsActive = true,
            EmailVerified = true
        };
        admin.UserRoles.Add(new UserRole { UserId = admin.Id, RoleId = adminRole.Id });

        var associate = new AppUser
        {
            CompanyId = company.Id,
            Email = "floor@harborline.com",
            DisplayName = "Sam Associate",
            PasswordHash = hasher.Hash("ChangeMe!Floor12"),
            AuthProvider = AuthProvider.Local,
            IsActive = true,
            EmailVerified = true
        };
        associate.UserRoles.Add(new UserRole { UserId = associate.Id, RoleId = floorRole.Id, WarehouseId = wh.Id });

        db.Users.AddRange(admin, associate);

        var customer = new Customer
        {
            CompanyId = company.Id,
            Code = "ACME",
            Name = "Acme Industrial",
            IsActive = true
        };
        db.Customers.Add(customer);

        for (var i = 1; i <= 12; i++)
        {
            db.StorageLocations.Add(new StorageLocation
            {
                CompanyId = company.Id,
                WarehouseId = wh.Id,
                Code = $"A-{i:D2}-01",
                Zone = "A",
                Aisle = "01",
                Rack = i.ToString("D2"),
                Bin = "01",
                IsActive = true
            });
        }

        db.EmailConfigurations.Add(new EmailConfiguration
        {
            CompanyId = company.Id,
            Provider = EmailProvider.Smtp,
            SettingsJson = """{"host":"smtp.example.com","port":587,"from":"noreply@harborline.com"}""",
            DistributionListsJson = """{"ops":["ops@harborline.com"],"exec":["exec@harborline.com"]}""",
            IsActive = true
        });

        await db.SaveChangesAsync();
        logger.LogInformation("Seeded demo tenant Harborline Logistics");
    }

    /// <summary>
    /// EnsureCreated does not alter existing databases. Patch additive SaaS columns safely.
    /// </summary>
    private static async Task EnsureSchemaPatchesAsync(LogiForgeDbContext db, ILogger logger)
    {
        try
        {
            await db.Database.ExecuteSqlRawAsync("""
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS "TrialEndsAt" timestamp with time zone NULL;
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS "PlanCode" character varying(50) NOT NULL DEFAULT 'trial';
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS "StripeCustomerId" character varying(120) NULL;
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS "StripeSubscriptionId" character varying(120) NULL;
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS "StripePriceId" character varying(120) NULL;
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS "CurrentPeriodEnd" timestamp with time zone NULL;
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS "BillingEmail" character varying(320) NULL;

                ALTER TABLE users ADD COLUMN IF NOT EXISTS "EmailVerified" boolean NOT NULL DEFAULT TRUE;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS "EmailVerificationToken" character varying(120) NULL;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS "EmailVerificationExpiresAt" timestamp with time zone NULL;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS "PasswordResetToken" character varying(120) NULL;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS "PasswordResetExpiresAt" timestamp with time zone NULL;
                """);
            logger.LogInformation("Applied SaaS schema patches");
        }
        catch (Exception ex)
        {
            // Fresh EnsureCreated already has columns; SQLite/local edge cases may fail — continue.
            logger.LogDebug(ex, "Schema patch skipped or partially applied");
        }
    }
}
