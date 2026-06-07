using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public class DocumentChunkRepository : IDocumentChunkRepository
{
    private readonly AppDbContext _context;

    public DocumentChunkRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<DocumentChunk>> GetByDocumentIdAsync(Guid documentId, CancellationToken cancellationToken = default)
    {
        return await _context.DocumentChunks
            .Where(c => c.DocumentId == documentId)
            .OrderBy(c => c.ChunkIndex)
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<DocumentChunk>> GetAllWithEmbeddingsByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _context.DocumentChunks
            .Include(c => c.Document)
            .Where(c => c.Document.UserId == userId && c.EmbeddingJson != null)
            .ToListAsync(cancellationToken);
    }

    public async Task CreateManyAsync(IEnumerable<DocumentChunk> chunks, CancellationToken cancellationToken = default)
    {
        _context.DocumentChunks.AddRange(chunks);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteByDocumentIdAsync(Guid documentId, CancellationToken cancellationToken = default)
    {
        var chunks = await _context.DocumentChunks
            .Where(c => c.DocumentId == documentId)
            .ToListAsync(cancellationToken);

        _context.DocumentChunks.RemoveRange(chunks);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
