using System.Text.Json;
using LogiForge.Domain.Exceptions;

namespace LogiForge.Api.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await WriteProblem(context, ex);
        }
    }

    private async Task WriteProblem(HttpContext context, Exception ex)
    {
        var (status, title, detail, errors) = ex switch
        {
            ValidationException ve => (StatusCodes.Status400BadRequest, "Validation failed", ve.Message, ve.Errors),
            NotFoundException nf => (StatusCodes.Status404NotFound, "Not found", nf.Message, null),
            ForbiddenException fb => (StatusCodes.Status403Forbidden, "Forbidden", fb.Message, null),
            DomainException de => (StatusCodes.Status400BadRequest, de.Code, de.Message, null),
            _ => (StatusCodes.Status500InternalServerError, "Server error", "An unexpected error occurred.", null)
        };

        if (status >= 500) _logger.LogError(ex, "Unhandled exception");
        else _logger.LogWarning(ex, "Handled domain exception");

        context.Response.ContentType = "application/problem+json";
        context.Response.StatusCode = status;
        var payload = new Dictionary<string, object?>
        {
            ["type"] = $"https://httpstatuses.com/{status}",
            ["title"] = title,
            ["status"] = status,
            ["detail"] = detail
        };
        if (errors is not null) payload["errors"] = errors;
        await context.Response.WriteAsync(JsonSerializer.Serialize(payload));
    }
}
