using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public class ChatMessageRepository : IChatMessageRepository
{
    private readonly AppDbContext _context;

    public ChatMessageRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ChatMessage?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.ChatMessages.FindAsync(new object[] { id }, cancellationToken);
    }

    public async Task<IEnumerable<ChatMessage>> GetBySessionIdAsync(Guid sessionId, CancellationToken cancellationToken = default)
    {
        return await _context.ChatMessages
            .Where(m => m.SessionId == sessionId)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<ChatMessage> CreateAsync(ChatMessage message, CancellationToken cancellationToken = default)
    {
        _context.ChatMessages.Add(message);
        await _context.SaveChangesAsync(cancellationToken);
        return message;
    }

    public async Task<int> GetCountBySessionIdAsync(Guid sessionId, CancellationToken cancellationToken = default)
    {
        return await _context.ChatMessages.CountAsync(m => m.SessionId == sessionId, cancellationToken);
    }
}