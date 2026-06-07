using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public class DocumentRepository : IDocumentRepository
{
    private readonly AppDbContext _context;

    public DocumentRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Document?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.Documents.FindAsync(new object[] { id }, cancellationToken);
    }

    public async Task<IEnumerable<Document>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _context.Documents
            .Where(d => d.UserId == userId)
            .OrderByDescending(d => d.UploadedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<(IEnumerable<Document> Documents, int TotalCount)> GetPagedByUserIdAsync(Guid userId, int page, int pageSize, CancellationToken cancellationToken = default)
    {
        var query = _context.Documents.Where(d => d.UserId == userId);

        var totalCount = await query.CountAsync(cancellationToken);

        var documents = await query
            .OrderByDescending(d => d.UploadedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (documents, totalCount);
    }

    public async Task<Document> CreateAsync(Document document, CancellationToken cancellationToken = default)
    {
        _context.Documents.Add(document);
        await _context.SaveChangesAsync(cancellationToken);
        return document;
    }

    public async Task<Document> UpdateAsync(Document document, CancellationToken cancellationToken = default)
    {
        _context.Documents.Update(document);
        await _context.SaveChangesAsync(cancellationToken);
        return document;
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var document = await GetByIdAsync(id, cancellationToken);
        if (document != null)
        {
            _context.Documents.Remove(document);
            await _context.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task<bool> ExistsAsync(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        return await _context.Documents.AnyAsync(d => d.Id == id && d.UserId == userId, cancellationToken);
    }
}