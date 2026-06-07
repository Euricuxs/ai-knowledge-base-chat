using Domain.Entities;

namespace Application.Interfaces;

public interface IDocumentRepository
{
    Task<Document?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IEnumerable<Document>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<(IEnumerable<Document> Documents, int TotalCount)> GetPagedByUserIdAsync(Guid userId, int page, int pageSize, CancellationToken cancellationToken = default);
    Task<Document> CreateAsync(Document document, CancellationToken cancellationToken = default);
    Task<Document> UpdateAsync(Document document, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<bool> ExistsAsync(Guid id, Guid userId, CancellationToken cancellationToken = default);
}