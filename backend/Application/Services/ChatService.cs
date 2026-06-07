using System.Runtime.CompilerServices;
using Application.DTOs;
using Application.Interfaces;
using Domain.Entities;

namespace Application.Services;

public class ChatService
{
    private readonly IChatSessionRepository _sessionRepository;
    private readonly IChatMessageRepository _messageRepository;
    private readonly IOllamaService _ollamaService;
    private readonly IVectorSearchService _vectorSearchService;

    public ChatService(
        IChatSessionRepository sessionRepository,
        IChatMessageRepository messageRepository,
        IOllamaService ollamaService,
        IVectorSearchService vectorSearchService)
    {
        _sessionRepository = sessionRepository;
        _messageRepository = messageRepository;
        _ollamaService = ollamaService;
        _vectorSearchService = vectorSearchService;
    }

    public async Task<IEnumerable<ChatSessionDto>> GetSessionsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var sessions = await _sessionRepository.GetByUserIdAsync(userId, cancellationToken);

        var sessionDtos = new List<ChatSessionDto>();
        foreach (var session in sessions)
        {
            var messageCount = await _messageRepository.GetCountBySessionIdAsync(session.Id, cancellationToken);
            sessionDtos.Add(new ChatSessionDto(
                session.Id,
                session.Title,
                session.CreatedAt,
                session.UpdatedAt,
                messageCount
            ));
        }

        return sessionDtos.OrderByDescending(s => s.UpdatedAt ?? s.CreatedAt);
    }

    public async Task<ChatSessionDetailDto?> GetSessionAsync(Guid sessionId, Guid userId, CancellationToken cancellationToken = default)
    {
        var session = await _sessionRepository.GetByIdWithMessagesAsync(sessionId, cancellationToken);

        if (session == null || session.UserId != userId)
        {
            return null;
        }

        var messages = session.Messages
            .OrderBy(m => m.CreatedAt)
            .Select(m => new ChatMessageDto(m.Id, m.Content, m.Role, m.CreatedAt));

        return new ChatSessionDetailDto(
            session.Id,
            session.Title,
            session.CreatedAt,
            session.UpdatedAt,
            messages.ToList()
        );
    }

    public async Task<ChatSessionDto> CreateSessionAsync(Guid userId, CreateChatSessionRequest request, CancellationToken cancellationToken = default)
    {
        var session = new ChatSession
        {
            Id = Guid.NewGuid(),
            Title = request.Title,
            UserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        await _sessionRepository.CreateAsync(session, cancellationToken);

        return new ChatSessionDto(
            session.Id,
            session.Title,
            session.CreatedAt,
            session.UpdatedAt,
            0
        );
    }

    public async Task<ChatSessionDto?> UpdateSessionAsync(Guid sessionId, Guid userId, UpdateChatSessionRequest request, CancellationToken cancellationToken = default)
    {
        var session = await _sessionRepository.GetByIdAsync(sessionId, cancellationToken);

        if (session == null || session.UserId != userId)
        {
            return null;
        }

        session.Title = request.Title;
        session.UpdatedAt = DateTime.UtcNow;

        await _sessionRepository.UpdateAsync(session, cancellationToken);

        var messageCount = await _messageRepository.GetCountBySessionIdAsync(session.Id, cancellationToken);

        return new ChatSessionDto(
            session.Id,
            session.Title,
            session.CreatedAt,
            session.UpdatedAt,
            messageCount
        );
    }

    public async Task<bool> DeleteSessionAsync(Guid sessionId, Guid userId, CancellationToken cancellationToken = default)
    {
        var session = await _sessionRepository.GetByIdAsync(sessionId, cancellationToken);

        if (session == null || session.UserId != userId)
        {
            return false;
        }

        await _sessionRepository.DeleteAsync(sessionId, cancellationToken);
        return true;
    }

    public async Task<ChatMessageDto> AddMessageAsync(Guid sessionId, Guid userId, SendMessageRequest request, CancellationToken cancellationToken = default)
    {
        var session = await _sessionRepository.GetByIdAsync(sessionId, cancellationToken);

        if (session == null || session.UserId != userId)
        {
            throw new InvalidOperationException("Session not found or access denied");
        }

        var userMessage = new ChatMessage
        {
            Id = Guid.NewGuid(),
            SessionId = sessionId,
            Content = request.Content,
            Role = "user",
            CreatedAt = DateTime.UtcNow
        };

        await _messageRepository.CreateAsync(userMessage, cancellationToken);

        session.UpdatedAt = DateTime.UtcNow;
        await _sessionRepository.UpdateAsync(session, cancellationToken);

        return new ChatMessageDto(userMessage.Id, userMessage.Content, userMessage.Role, userMessage.CreatedAt);
    }

    public async Task<AiResponseDto> GenerateAiResponseAsync(Guid sessionId, Guid userId, CancellationToken cancellationToken = default)
    {
        var session = await _sessionRepository.GetByIdWithMessagesAsync(sessionId, cancellationToken);

        if (session == null || session.UserId != userId)
        {
            throw new InvalidOperationException("Session not found or access denied");
        }

        var lastUserMessage = session.Messages
            .Where(m => m.Role == "user")
            .OrderBy(m => m.CreatedAt)
            .LastOrDefault();

        if (lastUserMessage == null)
        {
            throw new InvalidOperationException("No user message found");
        }

        var retrievedChunks = await _vectorSearchService.SearchAsync(userId, lastUserMessage.Content, 5, cancellationToken);
        var chunksList = retrievedChunks.ToList();

        var messages = BuildMessages(session, lastUserMessage.Content, chunksList);

        var aiContent = await _ollamaService.GenerateResponseAsync(messages, cancellationToken);

        var aiMessage = new ChatMessage
        {
            Id = Guid.NewGuid(),
            SessionId = sessionId,
            Content = aiContent,
            Role = "assistant",
            CreatedAt = DateTime.UtcNow
        };

        await _messageRepository.CreateAsync(aiMessage, cancellationToken);

        session.UpdatedAt = DateTime.UtcNow;
        await _sessionRepository.UpdateAsync(session, cancellationToken);

        var sources = chunksList.Select(c => new SourceDto(c.DocumentId, c.DocumentTitle, c.ChunkIndex)).ToList();

        return new AiResponseDto(aiContent, sources);
    }

    public async Task<(IAsyncEnumerable<ChatMessageDto> Stream, List<SourceDto> Sources)> StreamAiResponseWithSourcesAsync(
        Guid sessionId,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var session = await _sessionRepository.GetByIdWithMessagesAsync(sessionId, cancellationToken);

        if (session == null || session.UserId != userId)
        {
            throw new InvalidOperationException("Session not found or access denied");
        }

        var lastUserMessage = session.Messages
            .Where(m => m.Role == "user")
            .OrderBy(m => m.CreatedAt)
            .LastOrDefault();

        if (lastUserMessage == null)
        {
            throw new InvalidOperationException("No user message found");
        }

        var retrievedChunks = await _vectorSearchService.SearchAsync(userId, lastUserMessage.Content, 5, cancellationToken);
        var chunksList = retrievedChunks.ToList();

        var messages = BuildMessages(session, lastUserMessage.Content, chunksList);

        var sources = chunksList.Select(c => new SourceDto(c.DocumentId, c.DocumentTitle, c.ChunkIndex)).ToList();

        var stream = StreamAiResponseInternalAsync(sessionId, messages, cancellationToken);

        return (stream, sources);
    }

    private async IAsyncEnumerable<ChatMessageDto> StreamAiResponseInternalAsync(
        Guid sessionId,
        List<OllamaChatMessage> messages,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var fullResponse = new System.Text.StringBuilder();

        await foreach (var chunk in _ollamaService.StreamResponseAsync(messages, cancellationToken))
        {
            fullResponse.Append(chunk);
            yield return new ChatMessageDto(Guid.Empty, chunk, "streaming", DateTime.UtcNow);
        }

        if (fullResponse.Length > 0)
        {
            var aiMessage = new ChatMessage
            {
                Id = Guid.NewGuid(),
                SessionId = sessionId,
                Content = fullResponse.ToString(),
                Role = "assistant",
                CreatedAt = DateTime.UtcNow
            };

            await _messageRepository.CreateAsync(aiMessage, cancellationToken);
            await _sessionRepository.GetByIdAsync(sessionId, cancellationToken);
        }
    }

    private static List<OllamaChatMessage> BuildMessages(
        ChatSession session,
        string lastUserContent,
        List<RetrievedChunkDto> chunks)
    {
        var messages = new List<OllamaChatMessage>();

        if (chunks.Count > 0)
        {
            var contextText = string.Join("\n\n---\n\n", chunks.Select(c => c.Content));
            messages.Add(new OllamaChatMessage("system",
                $"Use only the document context below to answer. " +
                $"If the answer is not in the context, say you don't know. " +
                $"Ignore PDF artifacts and formatting noise.\n\n{contextText}"));
        }

        var allPrior = session.Messages
            .Where(m => m.Role == "user" || m.Role == "assistant")
            .OrderBy(m => m.CreatedAt)
            .TakeLast(11)
            .ToList();

        if (allPrior.Count > 1)
        {
            var priorMessages = allPrior.Take(allPrior.Count - 1);
            foreach (var msg in priorMessages)
            {
                messages.Add(new OllamaChatMessage(msg.Role, msg.Content));
            }
        }

        messages.Add(new OllamaChatMessage("user", lastUserContent));

        Console.WriteLine($"[ChatService] BuildMessages: {allPrior.Count} total in session, {messages.Count} sent to Ollama");

        return messages;
    }
}
