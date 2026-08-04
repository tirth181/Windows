using LogiForge.Domain.Common;
using LogiForge.Domain.Entities;
using LogiForge.Domain.Exceptions;
using LogiForge.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LogiForge.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/warehouses")]
public class WarehousesController : ControllerBase
{
    private readonly IRepository<Warehouse> _warehouses;
    private readonly ITenantContext _tenant;
    private readonly IUnitOfWork _uow;

    public WarehousesController(IRepository<Warehouse> warehouses, ITenantContext tenant, IUnitOfWork uow)
    {
        _warehouses = warehouses;
        _tenant = tenant;
        _uow = uow;
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        if (!_tenant.HasPermission(PermissionCodes.WarehouseView) && !_tenant.HasPermission(PermissionCodes.AdminFull))
            throw new ForbiddenException();
        var items = await _warehouses.Query().OrderBy(w => w.Name)
            .Select(w => new { w.Id, w.Code, w.Name, w.Timezone, w.IsActive })
            .ToListAsync(ct);
        return Ok(items);
    }

    public record CreateWarehouseRequest(string Code, string Name, string? Timezone);

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateWarehouseRequest request, CancellationToken ct)
    {
        if (!_tenant.HasPermission(PermissionCodes.WarehouseCreate) && !_tenant.HasPermission(PermissionCodes.AdminFull))
            throw new ForbiddenException();
        if (_tenant.CompanyId is null) throw new ForbiddenException();

        var wh = new Warehouse
        {
            CompanyId = _tenant.CompanyId.Value,
            Code = request.Code.Trim(),
            Name = request.Name.Trim(),
            Timezone = request.Timezone ?? "UTC",
            CreatedBy = _tenant.UserId
        };
        await _warehouses.AddAsync(wh, ct);
        await _uow.SaveChangesAsync(ct);
        return Ok(new { wh.Id, wh.Code, wh.Name, wh.Timezone, wh.IsActive });
    }
}
