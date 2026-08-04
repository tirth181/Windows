using LogiForge.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LogiForge.Infrastructure.Persistence.Configurations;

public class CompanyConfiguration : IEntityTypeConfiguration<Company>
{
    public void Configure(EntityTypeBuilder<Company> b)
    {
        b.ToTable("companies");
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).HasMaxLength(200).IsRequired();
        b.Property(x => x.Code).HasMaxLength(50).IsRequired();
        b.HasIndex(x => x.Code).IsUnique();
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(30);
    }
}

public class WarehouseConfiguration : IEntityTypeConfiguration<Warehouse>
{
    public void Configure(EntityTypeBuilder<Warehouse> b)
    {
        b.ToTable("warehouses");
        b.HasKey(x => x.Id);
        b.HasIndex(x => new { x.CompanyId, x.Code }).IsUnique();
        b.Property(x => x.Code).HasMaxLength(50);
        b.Property(x => x.Name).HasMaxLength(200);
        b.HasOne(x => x.Company).WithMany(c => c.Warehouses).HasForeignKey(x => x.CompanyId);
    }
}

public class AppUserConfiguration : IEntityTypeConfiguration<AppUser>
{
    public void Configure(EntityTypeBuilder<AppUser> b)
    {
        b.ToTable("users");
        b.HasKey(x => x.Id);
        b.HasIndex(x => x.Email).IsUnique();
        b.Property(x => x.Email).HasMaxLength(320);
        b.Property(x => x.DisplayName).HasMaxLength(200);
        b.Property(x => x.AuthProvider).HasConversion<string>().HasMaxLength(30);
        b.HasOne(x => x.Company).WithMany(c => c.Users).HasForeignKey(x => x.CompanyId);
    }
}

public class RoleConfiguration : IEntityTypeConfiguration<Role>
{
    public void Configure(EntityTypeBuilder<Role> b)
    {
        b.ToTable("roles");
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).HasMaxLength(100);
        b.HasIndex(x => new { x.CompanyId, x.Name }).IsUnique();
    }
}

public class PermissionConfiguration : IEntityTypeConfiguration<Permission>
{
    public void Configure(EntityTypeBuilder<Permission> b)
    {
        b.ToTable("permissions");
        b.HasKey(x => x.Id);
        b.HasIndex(x => x.Code).IsUnique();
        b.Property(x => x.Code).HasMaxLength(100);
    }
}

public class RolePermissionConfiguration : IEntityTypeConfiguration<RolePermission>
{
    public void Configure(EntityTypeBuilder<RolePermission> b)
    {
        b.ToTable("role_permissions");
        b.HasKey(x => new { x.RoleId, x.PermissionId });
        b.HasOne(x => x.Role).WithMany(r => r.RolePermissions).HasForeignKey(x => x.RoleId);
        b.HasOne(x => x.Permission).WithMany(p => p.RolePermissions).HasForeignKey(x => x.PermissionId);
    }
}

public class UserRoleConfiguration : IEntityTypeConfiguration<UserRole>
{
    public void Configure(EntityTypeBuilder<UserRole> b)
    {
        b.ToTable("user_roles");
        b.HasKey(x => x.Id);
        b.HasOne(x => x.User).WithMany(u => u.UserRoles).HasForeignKey(x => x.UserId);
        b.HasOne(x => x.Role).WithMany(r => r.UserRoles).HasForeignKey(x => x.RoleId);
        b.HasOne(x => x.Warehouse).WithMany().HasForeignKey(x => x.WarehouseId);
    }
}

public class CustomerConfiguration : IEntityTypeConfiguration<Customer>
{
    public void Configure(EntityTypeBuilder<Customer> b)
    {
        b.ToTable("customers");
        b.HasKey(x => x.Id);
        b.HasIndex(x => new { x.CompanyId, x.Code }).IsUnique();
        b.Property(x => x.Code).HasMaxLength(50);
        b.Property(x => x.Name).HasMaxLength(200);
    }
}

public class StorageLocationConfiguration : IEntityTypeConfiguration<StorageLocation>
{
    public void Configure(EntityTypeBuilder<StorageLocation> b)
    {
        b.ToTable("storage_locations");
        b.HasKey(x => x.Id);
        b.HasIndex(x => new { x.CompanyId, x.WarehouseId, x.Code }).IsUnique();
        b.Property(x => x.Code).HasMaxLength(50);
        b.HasOne(x => x.Warehouse).WithMany(w => w.Locations).HasForeignKey(x => x.WarehouseId);
    }
}

public class InboundLoadConfiguration : IEntityTypeConfiguration<InboundLoad>
{
    public void Configure(EntityTypeBuilder<InboundLoad> b)
    {
        b.ToTable("inbound_loads");
        b.HasKey(x => x.Id);
        b.HasIndex(x => new { x.CompanyId, x.LoadNumber }).IsUnique();
        b.Property(x => x.LoadNumber).HasMaxLength(50);
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(30);
        b.HasMany(x => x.Lines).WithOne(l => l.InboundLoad).HasForeignKey(l => l.InboundLoadId);
        b.HasOne(x => x.Customer).WithMany().HasForeignKey(x => x.CustomerId);
        b.HasOne(x => x.Warehouse).WithMany().HasForeignKey(x => x.WarehouseId);
    }
}

public class InboundLineConfiguration : IEntityTypeConfiguration<InboundLine>
{
    public void Configure(EntityTypeBuilder<InboundLine> b)
    {
        b.ToTable("inbound_lines");
        b.HasKey(x => x.Id);
        b.Property(x => x.MaterialCode).HasMaxLength(100);
        b.Property(x => x.BatchNumber).HasMaxLength(100);
        b.Property(x => x.Weight).HasPrecision(18, 4);
        b.Property(x => x.Quantity).HasPrecision(18, 4);
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(30);
    }
}

public class InventoryItemConfiguration : IEntityTypeConfiguration<InventoryItem>
{
    public void Configure(EntityTypeBuilder<InventoryItem> b)
    {
        b.ToTable("inventory_items");
        b.HasKey(x => x.Id);
        b.HasIndex(x => new { x.CompanyId, x.BatchNumber });
        b.HasIndex(x => new { x.CompanyId, x.WarehouseId, x.Status });
        b.HasIndex(x => new { x.CompanyId, x.MaterialCode });
        b.Property(x => x.OriginalWeight).HasPrecision(18, 4);
        b.Property(x => x.RemainingWeight).HasPrecision(18, 4);
        b.Property(x => x.Quantity).HasPrecision(18, 4);
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(30);
        b.HasOne(x => x.Customer).WithMany().HasForeignKey(x => x.CustomerId);
        b.HasOne(x => x.Warehouse).WithMany().HasForeignKey(x => x.WarehouseId);
        b.HasOne(x => x.Location).WithMany().HasForeignKey(x => x.LocationId);
    }
}

public class InventoryTransactionConfiguration : IEntityTypeConfiguration<InventoryTransaction>
{
    public void Configure(EntityTypeBuilder<InventoryTransaction> b)
    {
        b.ToTable("inventory_transactions");
        b.HasKey(x => x.Id);
        b.Property(x => x.TransactionType).HasConversion<string>().HasMaxLength(30);
        b.Property(x => x.QuantityDelta).HasPrecision(18, 4);
        b.Property(x => x.WeightDelta).HasPrecision(18, 4);
        b.HasOne(x => x.InventoryItem).WithMany().HasForeignKey(x => x.InventoryItemId);
    }
}

public class OutboundOrderConfiguration : IEntityTypeConfiguration<OutboundOrder>
{
    public void Configure(EntityTypeBuilder<OutboundOrder> b)
    {
        b.ToTable("outbound_orders");
        b.HasKey(x => x.Id);
        b.HasIndex(x => new { x.CompanyId, x.OrderNumber }).IsUnique();
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(30);
        b.Property(x => x.TotalWeight).HasPrecision(18, 4);
        b.HasMany(x => x.Lines).WithOne(l => l.OutboundOrder).HasForeignKey(l => l.OutboundOrderId);
        b.HasOne(x => x.Customer).WithMany().HasForeignKey(x => x.CustomerId);
        b.HasOne(x => x.Warehouse).WithMany().HasForeignKey(x => x.WarehouseId);
    }
}

public class OutboundLineConfiguration : IEntityTypeConfiguration<OutboundLine>
{
    public void Configure(EntityTypeBuilder<OutboundLine> b)
    {
        b.ToTable("outbound_lines");
        b.HasKey(x => x.Id);
        b.Property(x => x.Weight).HasPrecision(18, 4);
        b.Property(x => x.Quantity).HasPrecision(18, 4);
    }
}

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> b)
    {
        b.ToTable("audit_logs");
        b.HasKey(x => x.Id);
        b.HasIndex(x => new { x.CompanyId, x.OccurredAt });
    }
}

public class IntegrationConfiguration : IEntityTypeConfiguration<Integration>
{
    public void Configure(EntityTypeBuilder<Integration> b)
    {
        b.ToTable("integrations");
        b.HasKey(x => x.Id);
        b.Property(x => x.Type).HasConversion<string>().HasMaxLength(30);
        b.HasMany(x => x.FieldMappings).WithOne(m => m.Integration).HasForeignKey(m => m.IntegrationId);
    }
}

public class AiConversationConfiguration : IEntityTypeConfiguration<AiConversation>
{
    public void Configure(EntityTypeBuilder<AiConversation> b)
    {
        b.ToTable("ai_conversations");
        b.HasKey(x => x.Id);
        b.HasMany(x => x.Messages).WithOne(m => m.Conversation).HasForeignKey(m => m.ConversationId);
    }
}

public class AiMessageConfiguration : IEntityTypeConfiguration<AiMessage>
{
    public void Configure(EntityTypeBuilder<AiMessage> b)
    {
        b.ToTable("ai_messages");
        b.HasKey(x => x.Id);
    }
}
