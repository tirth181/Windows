namespace LogiForge.Domain.Enums;

public enum InventoryStatus
{
    Available = 0,
    Reserved = 1,
    Partial = 2,
    Hold = 3,
    Damaged = 4,
    Shipped = 5
}

public enum InboundStatus
{
    Draft = 0,
    Received = 1,
    Cancelled = 2
}

public enum OutboundStatus
{
    Draft = 0,
    Picking = 1,
    Shipped = 2,
    Cancelled = 3
}

public enum CompanyStatus
{
    Trial = 0,
    Active = 1,
    Suspended = 2
}

public enum AuthProvider
{
    Local = 0,
    Entra = 1,
    Sso = 2
}

public enum InventoryTransactionType
{
    Receive = 0,
    Ship = 1,
    Adjust = 2,
    Transfer = 3,
    Hold = 4,
    Release = 5
}

public enum IntegrationType
{
    Rest = 0,
    Soap = 1,
    GraphQl = 2,
    Webhook = 3,
    Database = 4,
    Csv = 5,
    Excel = 6
}

public enum EmailProvider
{
    Smtp = 0,
    Microsoft365 = 1
}

public enum EmailOutboxStatus
{
    Pending = 0,
    Sent = 1,
    Failed = 2
}
