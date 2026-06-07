using Domain.Enums;

namespace Domain.Entities;

public class Document
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string FilePath { get; set; } = string.Empty;
    public string? ContentText { get; set; }
    public Guid UserId { get; set; }
    public DateTime UploadedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public bool IsProcessed { get; set; }
    public DocumentStatus Status { get; set; } = DocumentStatus.Pending;

    public User User { get; set; } = null!;
    public ICollection<DocumentChunk> Chunks { get; set; } = new List<DocumentChunk>();
}