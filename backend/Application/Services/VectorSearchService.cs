using Application.DTOs;
using Application.Interfaces;
using Domain.Entities;

namespace Application.Services;

public class VectorSearchService : IVectorSearchService
{
    private readonly IDocumentChunkRepository _chunkRepository;
    private readonly IOllamaService _ollamaService;

    public VectorSearchService(
        IDocumentChunkRepository chunkRepository,
        IOllamaService ollamaService)
    {
        _chunkRepository = chunkRepository;
        _ollamaService = ollamaService;
    }

    public async Task<IEnumerable<RetrievedChunkDto>> SearchAsync(
        Guid userId,
        string query,
        int topK = 5,
        CancellationToken cancellationToken = default)
    {
        var queryEmbedding = await _ollamaService.GenerateEmbeddingAsync(query, cancellationToken);
        if (queryEmbedding.Length == 0) return Enumerable.Empty<RetrievedChunkDto>();

        var chunks = await _chunkRepository.GetAllWithEmbeddingsByUserIdAsync(userId, cancellationToken);

        var scored = chunks
            .Select(c => new
            {
                Chunk = c,
                Score = CosineSimilarity(queryEmbedding, c.GetEmbedding())
            })
            .Where(x => x.Score > 0)
            .OrderByDescending(x => x.Score)
            .Take(topK)
            .ToList();

        return scored.Select(x => new RetrievedChunkDto(
            x.Chunk.DocumentId,
            x.Chunk.Document.Title,
            x.Chunk.ChunkIndex,
            x.Chunk.Content,
            Math.Round(x.Score, 4)
        ));
    }

    private static double CosineSimilarity(float[] a, float[]? b)
    {
        if (b == null || a.Length != b.Length) return 0;

        double dot = 0, normA = 0, normB = 0;
        for (int i = 0; i < a.Length; i++)
        {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        var denom = Math.Sqrt(normA) * Math.Sqrt(normB);
        return denom > 0 ? dot / denom : 0;
    }
}
