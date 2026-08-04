using FluentValidation;
using LogiForge.Application.Outbound.Dtos;
using LogiForge.Domain.Common;
using LogiForge.Domain.Entities;
using LogiForge.Domain.Enums;
using LogiForge.Domain.Exceptions;
using LogiForge.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LogiForge.Application.Outbound.Commands;

public record UpdateOutboundCommand(Guid Id, CreateOutboundRequest Request) : IRequest<OutboundOrderDto>;

public class UpdateOutboundCommandValidator : AbstractValidator<UpdateOutboundCommand>
{
    public UpdateOutboundCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Request.CustomerId).NotEmpty();
        RuleFor(x => x.Request.WarehouseId).NotEmpty();
        RuleFor(x => x.Request.Lines).NotEmpty();
    }
}

public class UpdateOutboundCommandHandler : IRequestHandler<UpdateOutboundCommand, OutboundOrderDto>
{
    private readonly IRepository<OutboundOrder> _orders;
    private readonly IRepository<InventoryItem> _inventory;
    private readonly ITenantContext _tenant;
    private readonly IUnitOfWork _uow;
    private readonly IAuditService _audit;

    public UpdateOutboundCommandHandler(
        IRepository<OutboundOrder> orders,
        IRepository<InventoryItem> inventory,
        ITenantContext tenant,
        IUnitOfWork uow,
        IAuditService audit)
    {
        _orders = orders;
        _inventory = inventory;
        _tenant = tenant;
        _uow = uow;
        _audit = audit;
    }

    public async Task<OutboundOrderDto> Handle(UpdateOutboundCommand request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.OutboundEdit) && !_tenant.HasPermission(PermissionCodes.AdminFull))
            throw new ForbiddenException();

        var order = await _orders.Query()
            .Include(o => o.Lines)
            .Include(o => o.Customer)
            .FirstOrDefaultAsync(o => o.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(OutboundOrder), request.Id);

        if (order.Status is OutboundStatus.Shipped or OutboundStatus.Cancelled)
            throw new DomainException("invalid_state", "Shipped or cancelled orders cannot be modified.");

        order.CustomerId = request.Request.CustomerId;
        order.WarehouseId = request.Request.WarehouseId;
        order.CustomerPo = request.Request.CustomerPo;
        order.ShippingTerms = request.Request.ShippingTerms;
        order.Carrier = request.Request.Carrier;
        order.TrackingNumber = request.Request.TrackingNumber;
        order.ShipmentDate = request.Request.ShipmentDate.ToUniversalTime();
        order.TrailerNumber = request.Request.TrailerNumber;
        order.UpdatedAt = DateTime.UtcNow;
        order.UpdatedBy = _tenant.UserId;

        foreach (var existing in order.Lines.Where(l => !l.IsDeleted).ToList())
        {
            existing.IsDeleted = true;
            existing.DeletedAt = DateTime.UtcNow;
            existing.UpdatedBy = _tenant.UserId;
        }

        foreach (var line in request.Request.Lines)
        {
            var item = await _inventory.GetByIdAsync(line.InventoryItemId, cancellationToken)
                ?? throw new NotFoundException(nameof(InventoryItem), line.InventoryItemId);
            if (line.Weight > item.RemainingWeight || line.Quantity > item.Quantity)
                throw new DomainException("insufficient_inventory", $"Insufficient inventory for batch {item.BatchNumber}.");

            order.Lines.Add(new OutboundLine
            {
                CompanyId = order.CompanyId,
                OutboundOrderId = order.Id,
                InventoryItemId = item.Id,
                MaterialCode = item.MaterialCode,
                BatchNumber = item.BatchNumber,
                Weight = line.Weight,
                Quantity = line.Quantity,
                LocationId = item.LocationId,
                PalletCount = line.PalletCount,
                BoxCount = line.BoxCount,
                CreatedBy = _tenant.UserId
            });
        }

        CreateOutboundCommandHandler.Recalc(order);
        await _uow.SaveChangesAsync(cancellationToken);
        await _audit.WriteAsync("outbound.update", nameof(OutboundOrder), order.Id, null, new { order.OrderNumber }, cancellationToken);

        order = await _orders.Query()
            .Include(o => o.Lines)
            .Include(o => o.Customer)
            .FirstAsync(o => o.Id == request.Id, cancellationToken);

        return CreateOutboundCommandHandler.Map(order);
    }
}
