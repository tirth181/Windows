using LogiForge.Application.Common;
using LogiForge.Application.Inbound.Commands;
using LogiForge.Application.Inbound.Dtos;
using LogiForge.Domain.Common;
using LogiForge.Domain.Entities;
using LogiForge.Domain.Exceptions;
using LogiForge.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LogiForge.Application.Inbound.Queries;

public record GetInboundListQuery(int Page = 1, int PageSize = 50, Guid? WarehouseId = null, string? Search = null)
    : IRequest<PagedResult<InboundLoadDto>>;

public class GetInboundListQueryHandler : IRequestHandler<GetInboundListQuery, PagedResult<InboundLoadDto>>
{
    private readonly IRepository<InboundLoad> _loads;
    private readonly ITenantContext _tenant;

    public GetInboundListQueryHandler(IRepository<InboundLoad> loads, ITenantContext tenant)
    {
        _loads = loads;
        _tenant = tenant;
    }

    public async Task<PagedResult<InboundLoadDto>> Handle(GetInboundListQuery request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.InboundView) && !_tenant.HasPermission(PermissionCodes.AdminFull))
            throw new ForbiddenException();

        var q = _loads.Query().Include(l => l.Customer).Include(l => l.Warehouse).Include(l => l.Lines).AsQueryable();
        if (request.WarehouseId is not null) q = q.Where(l => l.WarehouseId == request.WarehouseId);
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim().ToLower();
            q = q.Where(l => l.LoadNumber.ToLower().Contains(s) || (l.Carrier != null && l.Carrier.ToLower().Contains(s)));
        }

        var total = await q.CountAsync(cancellationToken);
        var items = await q.OrderByDescending(l => l.ArrivalDate)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<InboundLoadDto>(items.Select(CreateInboundCommandHandler.Map).ToList(), request.Page, request.PageSize, total);
    }
}

public record GetInboundByIdQuery(Guid Id) : IRequest<InboundLoadDto>;

public class GetInboundByIdQueryHandler : IRequestHandler<GetInboundByIdQuery, InboundLoadDto>
{
    private readonly IRepository<InboundLoad> _loads;
    private readonly ITenantContext _tenant;

    public GetInboundByIdQueryHandler(IRepository<InboundLoad> loads, ITenantContext tenant)
    {
        _loads = loads;
        _tenant = tenant;
    }

    public async Task<InboundLoadDto> Handle(GetInboundByIdQuery request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.InboundView) && !_tenant.HasPermission(PermissionCodes.AdminFull))
            throw new ForbiddenException();

        var load = await _loads.Query()
            .Include(l => l.Lines)
            .Include(l => l.Customer)
            .Include(l => l.Warehouse)
            .FirstOrDefaultAsync(l => l.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(InboundLoad), request.Id);

        return CreateInboundCommandHandler.Map(load);
    }
}
