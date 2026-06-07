using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public class ChatSessionRepository : IChatSessionRepository
{
    private readonly AppDbContext _context;

    public ChatSessionRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ChatSession?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.ChatSessions.FindAsync(new object[] { id }, cancellationToken);
    }

    public async Task<ChatSession?> GetByIdWithMessagesAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.ChatSessions
            .Include(s => s.Messages)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
    }

    public async Task<IEnumerable<ChatSession>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _context.ChatSessions
            .Where(s => s.UserId == userId && !s.IsArchived)
            .OrderByDescending(s => s.UpdatedAt ?? s.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<ChatSession> CreateAsync(ChatSession session, CancellationToken cancellationToken = default)
    {
        _context.ChatSessions.Add(session);
        await _context.SaveChangesAsync(cancellationToken);
        return session;
    }

    public async Task<ChatSession> UpdateAsync(ChatSession session, CancellationToken cancellationToken = default)
    {
        _context.ChatSessions.Update(session);
        await _context.SaveChangesAsync(cancellationToken);
        return session;
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var session = await GetByIdAsync(id, cancellationToken);
        if (session != null)
        {
            _context.ChatSessions.Remove(session);
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}