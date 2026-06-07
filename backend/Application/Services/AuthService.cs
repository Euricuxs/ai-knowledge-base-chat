using Application.DTOs;
using Application.Interfaces;
using Domain.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace Application.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IConfiguration _configuration;

    public AuthService(
        IUserRepository userRepository,
        IRefreshTokenRepository refreshTokenRepository,
        IConfiguration configuration)
    {
        _userRepository = userRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _configuration = configuration;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        if (await _userRepository.ExistsAsync(request.Email, cancellationToken))
        {
            throw new InvalidOperationException("User with this email already exists");
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = request.Email.ToLowerInvariant(),
            PasswordHash = HashPassword(request.Password),
            FirstName = request.FirstName,
            LastName = request.LastName,
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };

        await _userRepository.CreateAsync(user, cancellationToken);

        return await GenerateAuthResponseAsync(user, cancellationToken);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email.ToLowerInvariant(), cancellationToken);

        if (user == null || !VerifyPassword(request.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Invalid email or password");
        }

        if (!user.IsActive)
        {
            throw new UnauthorizedAccessException("User account is deactivated");
        }

        return await GenerateAuthResponseAsync(user, cancellationToken);
    }

    public async Task<RefreshTokenResponse> RefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        var token = await _refreshTokenRepository.GetByTokenAsync(refreshToken, cancellationToken);

        if (token == null || !token.IsActive)
        {
            throw new UnauthorizedAccessException("Invalid or expired refresh token");
        }

        token.RevokedAt = DateTime.UtcNow;
        token.RevokedByIp = "system";
        await _refreshTokenRepository.UpdateAsync(token, cancellationToken);

        var user = await _userRepository.GetByIdAsync(token.UserId, cancellationToken);
        if (user == null)
        {
            throw new UnauthorizedAccessException("User not found");
        }

        var accessToken = GenerateAccessToken(user);
        var newRefreshToken = GenerateRefreshToken();
        var expiresAt = DateTime.UtcNow.AddDays(7);

        var refreshTokenEntity = new RefreshToken
        {
            Id = Guid.NewGuid(),
            Token = newRefreshToken,
            UserId = user.Id,
            ExpiresAt = expiresAt,
            CreatedAt = DateTime.UtcNow
        };

        await _refreshTokenRepository.CreateAsync(refreshTokenEntity, cancellationToken);

        return new RefreshTokenResponse(accessToken, newRefreshToken, expiresAt);
    }

    public async Task RevokeTokenAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        var token = await _refreshTokenRepository.GetByTokenAsync(refreshToken, cancellationToken);

        if (token != null && !token.IsRevoked)
        {
            token.RevokedAt = DateTime.UtcNow;
            await _refreshTokenRepository.UpdateAsync(token, cancellationToken);
        }
    }

    private async Task<AuthResponse> GenerateAuthResponseAsync(User user, CancellationToken cancellationToken)
    {
        var accessToken = GenerateAccessToken(user);
        var refreshToken = GenerateRefreshToken();
        var expiresAt = DateTime.UtcNow.AddMinutes(15);

        var refreshTokenEntity = new RefreshToken
        {
            Id = Guid.NewGuid(),
            Token = refreshToken,
            UserId = user.Id,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow
        };

        await _refreshTokenRepository.CreateAsync(refreshTokenEntity, cancellationToken);

        return new AuthResponse(
            accessToken,
            refreshToken,
            expiresAt,
            new UserDto(user.Id, user.Email, user.FirstName, user.LastName, user.CreatedAt)
        );
    }

    private string GenerateAccessToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Secret"] ?? throw new InvalidOperationException("JWT Secret not configured")));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.GivenName, user.FirstName),
            new Claim(ClaimTypes.Surname, user.LastName),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(15),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }

    private static string HashPassword(string password)
        => BCrypt.Net.BCrypt.HashPassword(password);

    private static bool VerifyPassword(string password, string hash)
        => BCrypt.Net.BCrypt.Verify(password, hash);
}