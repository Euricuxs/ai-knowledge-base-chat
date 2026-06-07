using System.Text.RegularExpressions;
using System.Text;
using Application.Interfaces;
using Domain.Entities;
using Domain.Enums;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;

namespace Application.Services;

public class DocumentProcessingService
{
    private readonly IDocumentRepository _documentRepository;
    private readonly IDocumentChunkRepository _chunkRepository;
    private readonly IOllamaService _ollamaService;
    private const int ChunkSize = 800;

    public DocumentProcessingService(
        IDocumentRepository documentRepository,
        IDocumentChunkRepository chunkRepository,
        IOllamaService ollamaService)
    {
        _documentRepository = documentRepository;
        _chunkRepository = chunkRepository;
        _ollamaService = ollamaService;
    }

    public async Task ProcessDocumentAsync(Guid documentId, CancellationToken cancellationToken = default)
    {
        var document = await _documentRepository.GetByIdAsync(documentId, cancellationToken);

        if (document == null)
        {
            return;
        }

        document.Status = DocumentStatus.Processing;
        await _documentRepository.UpdateAsync(document, cancellationToken);

        try
        {
            var extractResult = ExtractTextFromPdf(document.FilePath);
            Console.WriteLine($"[DocumentProcessing] Document {documentId}: {extractResult.PageCount} pages, raw {extractResult.TextLength} chars");

            if (extractResult.TextLength < 100)
            {
                Console.WriteLine($"[DocumentProcessing] Document {documentId}: insufficient text ({extractResult.TextLength} chars) - likely scanned/image PDF");
                document.Status = DocumentStatus.Failed;
                await _documentRepository.UpdateAsync(document, cancellationToken);
                return;
            }

            var preview = extractResult.Text.Substring(0, Math.Min(500, extractResult.TextLength));
            Console.WriteLine($"[DocumentProcessing] Document {documentId}: preview: {preview.Replace("\n", "\\n")}");

            var cleanText = CleanText(extractResult.Text);

            if (string.IsNullOrWhiteSpace(cleanText) || cleanText.Length < 50)
            {
                Console.WriteLine($"[DocumentProcessing] Document {documentId}: clean text too short ({cleanText.Length} chars)");
                document.Status = DocumentStatus.Failed;
                await _documentRepository.UpdateAsync(document, cancellationToken);
                return;
            }

            document.ContentText = cleanText;

            var chunks = SplitIntoChunks(documentId, cleanText);
            Console.WriteLine($"[DocumentProcessing] Document {documentId}: {cleanText.Length} chars → {chunks.Count} chunks");

            var semaphore = new SemaphoreSlim(5);
            var tasks = chunks.Select(async chunk =>
            {
                await semaphore.WaitAsync(cancellationToken);
                try
                {
                    var embedding = await _ollamaService.GenerateEmbeddingAsync(chunk.Content, cancellationToken);
                    chunk.SetEmbedding(embedding);
                }
                finally
                {
                    semaphore.Release();
                }
            });
            await Task.WhenAll(tasks);

            await _chunkRepository.DeleteByDocumentIdAsync(documentId, cancellationToken);
            await _chunkRepository.CreateManyAsync(chunks, cancellationToken);

            document.IsProcessed = true;
            document.ProcessedAt = DateTime.UtcNow;
            document.Status = DocumentStatus.Completed;
            await _documentRepository.UpdateAsync(document, cancellationToken);

            Console.WriteLine($"[DocumentProcessing] Document {documentId}: completed");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DocumentProcessing] Document {documentId}: failed - {ex.Message}");
            document.Status = DocumentStatus.Failed;
            await _documentRepository.UpdateAsync(document, cancellationToken);
        }
    }

    public static PdfExtractResult ExtractTextFromPdf(string filePath)
    {
        if (!File.Exists(filePath))
        {
            return new PdfExtractResult(0, string.Empty);
        }

        using var document = PdfDocument.Open(filePath);
        var sb = new StringBuilder();

        foreach (var page in document.GetPages())
        {
            var text = page.Text;
            if (!string.IsNullOrWhiteSpace(text))
            {
                sb.AppendLine(text.Trim());
                sb.AppendLine();
            }
        }

        return new PdfExtractResult(document.NumberOfPages, sb.ToString());
    }

    private static string CleanText(string rawText)
    {
        if (string.IsNullOrWhiteSpace(rawText))
        {
            return string.Empty;
        }

        var text = rawText;

        text = Regex.Replace(text, @"\s+", " ");
        text = Regex.Replace(text, @" {2,}", " ");
        text = Regex.Replace(text, @"\n{3,}", "\n\n");
        text = Regex.Replace(text, @"[ \t]*\n[ \t]*", "\n");
        text = Regex.Replace(text, @"^\s+|\s+$", string.Empty, RegexOptions.Multiline);

        var lines = text.Split('\n')
            .Select(l => l.Trim())
            .Where(l => !string.IsNullOrWhiteSpace(l))
            .ToList();

        var deduped = new List<string>();
        string? prev = null;
        foreach (var line in lines)
        {
            if (line != prev)
            {
                deduped.Add(line);
                prev = line;
            }
        }

        return string.Join("\n", deduped).Trim();
    }

    public static List<DocumentChunk> SplitIntoChunks(Guid documentId, string text)
    {
        var chunks = new List<DocumentChunk>();

        var paragraphs = text
            .Split(new[] { "\n\n", "\r\n\r\n" }, StringSplitOptions.RemoveEmptyEntries)
            .Select(p => p.Trim())
            .Where(p => p.Length > 20)
            .ToList();

        var currentChunk = new StringBuilder();
        var chunkIndex = 0;

        foreach (var paragraph in paragraphs)
        {
            if (paragraph.Length <= ChunkSize)
            {
                if (currentChunk.Length + paragraph.Length + 2 <= ChunkSize)
                {
                    if (currentChunk.Length > 0)
                    {
                        currentChunk.Append("\n\n");
                    }
                    currentChunk.Append(paragraph);
                }
                else
                {
                    if (currentChunk.Length > 0)
                    {
                        chunks.Add(MakeChunk(documentId, chunkIndex++, currentChunk.ToString()));
                        currentChunk.Clear();
                    }
                    chunks.Add(MakeChunk(documentId, chunkIndex++, paragraph));
                    currentChunk.Clear();
                }
            }
            else
            {
                var sentences = Regex.Split(paragraph, @"(?<=[.!?])\s+")
                    .Select(s => s.Trim())
                    .Where(s => s.Length > 0)
                    .ToList();

                foreach (var sentence in sentences)
                {
                    if (currentChunk.Length + sentence.Length + 1 <= ChunkSize)
                    {
                        if (currentChunk.Length > 0)
                        {
                            currentChunk.Append(" ");
                        }
                        currentChunk.Append(sentence);
                    }
                    else
                    {
                        if (currentChunk.Length > 0)
                        {
                            chunks.Add(MakeChunk(documentId, chunkIndex++, currentChunk.ToString()));
                        }
                        currentChunk.Clear();
                        currentChunk.Append(sentence);
                    }
                }
            }
        }

        if (currentChunk.Length > 0)
        {
            chunks.Add(MakeChunk(documentId, chunkIndex, currentChunk.ToString()));
        }

        return chunks;
    }

    private static DocumentChunk MakeChunk(Guid documentId, int index, string content)
    {
        return new DocumentChunk
        {
            Id = Guid.NewGuid(),
            DocumentId = documentId,
            ChunkIndex = index,
            Content = content
        };
    }
}

public record PdfExtractResult(int PageCount, string Text)
{
    public int TextLength => Text?.Length ?? 0;
}