using LogiForge.Application.Common;
using LogiForge.Application.Outbound.Commands;
using LogiForge.Application.Outbound.Dtos;
using LogiForge.Domain.Common;
using LogiForge.Domain.Entities;
using LogiForge.Domain.Exceptions;
using LogiForge.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LogiForge.Application.Outbound.Queries;

public record GetOutboundListQuery(int Page = 1, int PageSize = 50, Guid? WarehouseId = null, string? Search = null)
    : IRequest<PagedResult<OutboundOrderDto>>;

public class GetOutboundListQueryHandler : IRequestHandler<GetOutboundListQuery, PagedResult<OutboundOrderDto>>
{
    private readonly IRepository<OutboundOrder> _orders;
    private readonly ITenantContext _tenant;

    public GetOutboundListQueryHandler(IRepository<OutboundOrder> orders, ITenantContext tenant)
    {
        _orders = orders;
        _tenant = tenant;
    }

    public async Task<PagedResult<OutboundOrderDto>> Handle(GetOutboundListQuery request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.OutboundView) && !_tenant.HasPermission(PermissionCodes.AdminFull))
            throw new ForbiddenException();

        var q = _orders.Query().Include(o => o.Customer).Include(o => o.Lines).AsQueryable();
        if (request.WarehouseId is not null) q = q.Where(o => o.WarehouseId == request.WarehouseId);
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim().ToLower();
            q = q.Where(o => o.OrderNumber.ToLower().Contains(s) || (o.CustomerPo != null && o.CustomerPo.ToLower().Contains(s)));
        }

        var total = await q.CountAsync(cancellationToken);
        var items = await q.OrderByDescending(o => o.ShipmentDate)
            .Skip((request.Page - 1) * request.PageSize).Take(request.PageSize)
            .ToListAsync(cancellationToken);
        return new PagedResult<OutboundOrderDto>(items.Select(CreateOutboundCommandHandler.Map).ToList(), request.Page, request.PageSize, total);
    }
}

public record GetOutboundByIdQuery(Guid Id) : IRequest<OutboundOrderDto>;

public class GetOutboundByIdQueryHandler : IRequestHandler<GetOutboundByIdQuery, OutboundOrderDto>
{
    private readonly IRepository<OutboundOrder> _orders;
    private readonly ITenantContext _tenant;

    public GetOutboundByIdQueryHandler(IRepository<OutboundOrder> orders, ITenantContext tenant)
    {
        _orders = orders;
        _tenant = tenant;
    }

    public async Task<OutboundOrderDto> Handle(GetOutboundByIdQuery request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.OutboundView) && !_tenant.HasPermission(PermissionCodes.AdminFull))
            throw new ForbiddenException();

        var order = await _orders.Query().Include(o => o.Lines).Include(o => o.Customer)
            .FirstOrDefaultAsync(o => o.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(OutboundOrder), request.Id);
        return CreateOutboundCommandHandler.Map(order);
    }
}
