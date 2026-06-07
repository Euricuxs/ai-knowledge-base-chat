using Domain.Entities;

namespace Application.Interfaces;

public interface IChatMessageRepository
{
    Task<ChatMessage?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IEnumerable<ChatMessage>> GetBySessionIdAsync(Guid sessionId, CancellationToken cancellationToken = default);
    Task<ChatMessage> CreateAsync(ChatMessage message, CancellationToken cancellationToken = default);
    Task<int> GetCountBySessionIdAsync(Guid sessionId, CancellationToken cancellationToken = default);
}