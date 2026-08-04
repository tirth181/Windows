namespace LogiForge.Domain.Exceptions;

public class DomainException : Exception
{
    public string Code { get; }

    public DomainException(string code, string message) : base(message)
    {
        Code = code;
    }
}

public class NotFoundException : DomainException
{
    public NotFoundException(string entity, object key)
        : base("not_found", $"{entity} '{key}' was not found.") { }
}

public class ForbiddenException : DomainException
{
    public ForbiddenException(string message = "You are not authorized to perform this action.")
        : base("forbidden", message) { }
}

public class ValidationException : DomainException
{
    public IDictionary<string, string[]> Errors { get; }

    public ValidationException(IDictionary<string, string[]> errors)
        : base("validation_failed", "One or more validation errors occurred.")
    {
        Errors = errors;
    }
}
