using Application.DTOs;

namespace Application.Interfaces;

public interface IVectorSearchService
{
    Task<IEnumerable<RetrievedChunkDto>> SearchAsync(Guid userId, string query, int topK = 5, CancellationToken cancellationToken = default);
}
