using LogiForge.Domain.Common;
using LogiForge.Domain.Entities;
using LogiForge.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LogiForge.Infrastructure.Persistence;

public class LogiForgeDbContext : DbContext
{
    private readonly ITenantContext _tenant;

    public LogiForgeDbContext(DbContextOptions<LogiForgeDbContext> options, ITenantContext tenant) : base(options)
    {
        _tenant = tenant;
    }

    public DbSet<Company> Companies => Set<Company>();
    public DbSet<Warehouse> Warehouses => Set<Warehouse>();
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<LoginHistory> LoginHistories => Set<LoginHistory>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<StorageLocation> StorageLocations => Set<StorageLocation>();
    public DbSet<InboundLoad> InboundLoads => Set<InboundLoad>();
    public DbSet<InboundLine> InboundLines => Set<InboundLine>();
    public DbSet<InventoryItem> InventoryItems => Set<InventoryItem>();
    public DbSet<InventoryTransaction> InventoryTransactions => Set<InventoryTransaction>();
    public DbSet<OutboundOrder> OutboundOrders => Set<OutboundOrder>();
    public DbSet<OutboundLine> OutboundLines => Set<OutboundLine>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();
    public DbSet<EmailConfiguration> EmailConfigurations => Set<EmailConfiguration>();
    public DbSet<EmailOutbox> EmailOutbox => Set<EmailOutbox>();
    public DbSet<ReportSchedule> ReportSchedules => Set<ReportSchedule>();
    public DbSet<Integration> Integrations => Set<Integration>();
    public DbSet<FieldMapping> FieldMappings => Set<FieldMapping>();
    public DbSet<ApiKey> ApiKeys => Set<ApiKey>();
    public DbSet<AiConversation> AiConversations => Set<AiConversation>();
    public DbSet<AiMessage> AiMessages => Set<AiMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(LogiForgeDbContext).Assembly);

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(ITenantScoped).IsAssignableFrom(entityType.ClrType))
            {
                var method = typeof(LogiForgeDbContext)
                    .GetMethod(nameof(ApplyTenantFilter), System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!
                    .MakeGenericMethod(entityType.ClrType);
                method.Invoke(this, [modelBuilder]);
            }
        }

        base.OnModelCreating(modelBuilder);
    }

    private void ApplyTenantFilter<TEntity>(ModelBuilder modelBuilder) where TEntity : class, ITenantScoped
    {
        modelBuilder.Entity<TEntity>().HasQueryFilter(e =>
            _tenant.IsPlatformAdmin ||
            (_tenant.CompanyId != null && e.CompanyId == _tenant.CompanyId));
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var entry in ChangeTracker.Entries<EntityBase>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = DateTime.UtcNow;
                if (entry.Entity is ITenantScoped tenantEntity && tenantEntity.CompanyId == Guid.Empty && _tenant.CompanyId is not null)
                    tenantEntity.CompanyId = _tenant.CompanyId.Value;
            }
            if (entry.State == EntityState.Modified)
                entry.Entity.UpdatedAt = DateTime.UtcNow;
        }
        return base.SaveChangesAsync(cancellationToken);
    }
}
