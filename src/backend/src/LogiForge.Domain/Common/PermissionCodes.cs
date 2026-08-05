namespace LogiForge.Domain.Common;

public static class PermissionCodes
{
    public const string DashboardView = "dashboard.view";

    public const string InboundView = "inbound.view";
    public const string InboundCreate = "inbound.create";
    public const string InboundEdit = "inbound.edit";
    public const string InboundDelete = "inbound.delete";
    public const string InboundApprove = "inbound.approve";

    public const string InventoryView = "inventory.view";
    public const string InventoryAdjust = "inventory.adjust";
    public const string InventoryTransfer = "inventory.transfer";
    public const string InventoryExport = "inventory.export";

    public const string OutboundView = "outbound.view";
    public const string OutboundCreate = "outbound.create";
    public const string OutboundEdit = "outbound.edit";
    public const string OutboundPick = "outbound.pick";
    public const string OutboundShip = "outbound.ship";
    public const string OutboundCancel = "outbound.cancel";

    public const string ReportsView = "reports.view";
    public const string ReportsExport = "reports.export";
    public const string ReportsSchedule = "reports.schedule";

    public const string CustomersView = "customers.view";
    public const string CustomersManage = "customers.manage";

    public const string LocationsView = "locations.view";
    public const string LocationsManage = "locations.manage";

    public const string UsersView = "users.view";
    public const string UsersCreate = "users.create";
    public const string UsersEdit = "users.edit";
    public const string UsersAssignRoles = "users.assign_roles";

    public const string RolesView = "roles.view";
    public const string RolesManage = "roles.manage";

    public const string CompanyView = "company.view";
    public const string CompanyEdit = "company.edit";
    public const string WarehouseView = "warehouse.view";
    public const string WarehouseCreate = "warehouse.create";
    public const string WarehouseEdit = "warehouse.edit";
    public const string WarehouseDelete = "warehouse.delete";

    public const string AdminFull = "admin.full";
    public const string AiUse = "ai.use";
    public const string IntegrationsManage = "integrations.manage";
    public const string SettingsManage = "settings.manage";
    public const string AuditView = "audit.view";
    public const string PlatformAdmin = "platform.admin";

    public static IReadOnlyList<(string Code, string Module, string Action, string Description)> Catalog { get; } =
    [
        (DashboardView, "Dashboard", "View", "View operational dashboard"),
        (InboundView, "Inbound", "View", "View inbound loads"),
        (InboundCreate, "Inbound", "Create", "Create inbound loads"),
        (InboundEdit, "Inbound", "Edit", "Edit inbound loads"),
        (InboundDelete, "Inbound", "Delete", "Delete inbound loads"),
        (InboundApprove, "Inbound", "Approve", "Receive and approve inbound loads"),
        (InventoryView, "Inventory", "View", "View inventory"),
        (InventoryAdjust, "Inventory", "Adjust", "Adjust inventory quantities"),
        (InventoryTransfer, "Inventory", "Transfer", "Transfer inventory between locations"),
        (InventoryExport, "Inventory", "Export", "Export inventory"),
        (OutboundView, "Outbound", "View", "View outbound orders"),
        (OutboundCreate, "Outbound", "Create", "Create outbound orders"),
        (OutboundEdit, "Outbound", "Edit", "Edit outbound orders"),
        (OutboundPick, "Outbound", "Pick", "Pick outbound orders"),
        (OutboundShip, "Outbound", "Ship", "Confirm shipments"),
        (OutboundCancel, "Outbound", "Cancel", "Cancel outbound orders"),
        (ReportsView, "Reports", "View", "View reports"),
        (ReportsExport, "Reports", "Export", "Export reports"),
        (ReportsSchedule, "Reports", "Schedule", "Schedule reports"),
        (CustomersView, "Customers", "View", "View customers"),
        (CustomersManage, "Customers", "Manage", "Create and edit customers"),
        (LocationsView, "Slots", "View", "View storage slots"),
        (LocationsManage, "Slots", "Manage", "Manage storage slots"),
        (UsersView, "Users", "View", "View users"),
        (UsersCreate, "Users", "Create", "Create users"),
        (UsersEdit, "Users", "Edit", "Edit users"),
        (UsersAssignRoles, "Users", "AssignRoles", "Assign roles to users"),
        (RolesView, "Roles", "View", "View roles"),
        (RolesManage, "Roles", "Manage", "Manage roles and permissions"),
        (CompanyView, "3PL Company", "View", "View 3PL company profile"),
        (CompanyEdit, "3PL Company", "Edit", "Edit 3PL company profile"),
        (WarehouseView, "3PL Company", "View", "View 3PL companies"),
        (WarehouseCreate, "3PL Company", "Create", "Create 3PL companies"),
        (WarehouseEdit, "3PL Company", "Edit", "Edit 3PL companies"),
        (WarehouseDelete, "3PL Company", "Delete", "Delete 3PL companies"),
        (AdminFull, "Administration", "FullAccess", "Full administrative access"),
        (AiUse, "AI", "Use", "Use AI assistant"),
        (IntegrationsManage, "Integrations", "Manage", "Manage integrations and API keys"),
        (SettingsManage, "Settings", "Manage", "Manage company settings"),
        (AuditView, "Audit", "View", "View audit and login history"),
        (PlatformAdmin, "Platform", "Admin", "Platform super administrator")
    ];
}
