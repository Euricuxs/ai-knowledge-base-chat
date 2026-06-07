using System.Text.Json;

namespace Domain.Entities;

public class DocumentChunk
{
    public Guid Id { get; set; }
    public Guid DocumentId { get; set; }
    public int ChunkIndex { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? EmbeddingJson { get; set; }

    public Document Document { get; set; } = null!;

    public float[]? GetEmbedding()
    {
        if (string.IsNullOrEmpty(EmbeddingJson)) return null;
        return JsonSerializer.Deserialize<float[]>(EmbeddingJson);
    }

    public void SetEmbedding(float[] embedding)
    {
        EmbeddingJson = JsonSerializer.Serialize(embedding);
    }
}