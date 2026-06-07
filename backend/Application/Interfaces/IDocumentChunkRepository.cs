using Domain.Entities;

namespace Application.Interfaces;

public interface IDocumentChunkRepository
{
    Task<IEnumerable<DocumentChunk>> GetByDocumentIdAsync(Guid documentId, CancellationToken cancellationToken = default);
    Task<IEnumerable<DocumentChunk>> GetAllWithEmbeddingsByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task CreateManyAsync(IEnumerable<DocumentChunk> chunks, CancellationToken cancellationToken = default);
    Task DeleteByDocumentIdAsync(Guid documentId, CancellationToken cancellationToken = default);
}
