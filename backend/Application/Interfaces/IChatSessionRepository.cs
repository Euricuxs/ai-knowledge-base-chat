using Domain.Entities;

namespace Application.Interfaces;

public interface IChatSessionRepository
{
    Task<ChatSession?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ChatSession?> GetByIdWithMessagesAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IEnumerable<ChatSession>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<ChatSession> CreateAsync(ChatSession session, CancellationToken cancellationToken = default);
    Task<ChatSession> UpdateAsync(ChatSession session, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}