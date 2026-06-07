namespace Application.DTOs;

public record RegisterRequest(
    string Email,
    string Password,
    string FirstName,
    string LastName
);

public record LoginRequest(
    string Email,
    string Password
);

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt,
    UserDto User
);

public record RefreshTokenRequest(string RefreshToken);

public record RefreshTokenResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt
);

public record UserDto(
    Guid Id,
    string Email,
    string FirstName,
    string LastName,
    DateTime CreatedAt
);