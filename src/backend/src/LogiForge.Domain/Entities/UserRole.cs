namespace LogiForge.Domain.Entities;

public class UserRole
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid RoleId { get; set; }
    public Guid? WarehouseId { get; set; }

    public AppUser? User { get; set; }
    public Role? Role { get; set; }
    public Warehouse? Warehouse { get; set; }
}
