using Domain.Entities;

namespace Application.Interfaces;

public interface IRefreshTokenRepository
{
    Task<RefreshToken?> GetByTokenAsync(string token, CancellationToken cancellationToken = default);
    Task<RefreshToken> CreateAsync(RefreshToken refreshToken, CancellationToken cancellationToken = default);
    Task<RefreshToken> UpdateAsync(RefreshToken refreshToken, CancellationToken cancellationToken = default);
    Task RevokeAllUserTokensAsync(Guid userId, CancellationToken cancellationToken = default);
}