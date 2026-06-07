namespace Application.DTOs;

public record ChatSessionDto(
    Guid Id,
    string Title,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    int MessageCount
);

public record CreateChatSessionRequest(string Title);

public record UpdateChatSessionRequest(string Title);

public record ChatMessageDto(
    Guid Id,
    string Content,
    string Role,
    DateTime CreatedAt
);

public record SendMessageRequest(
    string Content,
    Guid? SessionId
);

public record ChatSessionDetailDto(
    Guid Id,
    string Title,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    List<ChatMessageDto> Messages
);

public record RetrievedChunkDto(
    Guid DocumentId,
    string DocumentTitle,
    int ChunkIndex,
    string Content,
    double Score
);

public record AiResponseDto(
    string Answer,
    List<SourceDto> Sources
);

public record SourceDto(
    Guid DocumentId,
    string DocumentName,
    int ChunkIndex
);