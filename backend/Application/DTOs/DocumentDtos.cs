namespace Application.DTOs;

public record DocumentDto(
    Guid Id,
    string Title,
    string FileName,
    string ContentType,
    long FileSize,
    DateTime UploadedAt,
    bool IsProcessed,
    DocumentStatusDto Status
);

public record DocumentDetailDto(
    Guid Id,
    string Title,
    string FileName,
    string ContentType,
    long FileSize,
    DateTime UploadedAt,
    bool IsProcessed,
    DocumentStatusDto Status,
    DateTime? ProcessedAt
);

public record DocumentListDto(
    IEnumerable<DocumentDto> Documents,
    int TotalCount,
    int Page,
    int PageSize
);

public record UploadDocumentResponse(
    Guid Id,
    string Title,
    string FileName,
    string ContentType,
    long FileSize,
    DateTime UploadedAt,
    bool IsProcessed,
    DocumentStatusDto Status
);

public enum DocumentStatusDto
{
    Pending,
    Processing,
    Completed,
    Failed
}

public record RagStatusDto(
    int IndexedDocuments,
    int TotalChunks
);

public record DocumentPreviewDto(
    Guid DocumentId,
    string Title,
    int PageCount,
    int TextLength,
    string ExtractedTextPreview,
    int ChunkCount
);