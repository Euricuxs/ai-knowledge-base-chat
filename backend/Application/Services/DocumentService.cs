using Application.DTOs;
using Application.Interfaces;
using Domain.Entities;
using Domain.Enums;

namespace Application.Services;

public class DocumentService
{
    private readonly IDocumentRepository _documentRepository;
    private readonly IDocumentChunkRepository _chunkRepository;

    public DocumentService(IDocumentRepository documentRepository, IDocumentChunkRepository chunkRepository)
    {
        _documentRepository = documentRepository;
        _chunkRepository = chunkRepository;
    }

    public async Task<RagStatusDto> GetRagStatusAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var chunks = await _chunkRepository.GetAllWithEmbeddingsByUserIdAsync(userId, cancellationToken);
        var chunksList = chunks.ToList();

        var indexedDocuments = chunksList.Select(c => c.DocumentId).Distinct().Count();

        return new RagStatusDto(indexedDocuments, chunksList.Count);
    }

    public async Task<DocumentListDto> GetDocumentsAsync(Guid userId, int page, int pageSize, CancellationToken cancellationToken = default)
    {
        var (documents, totalCount) = await _documentRepository.GetPagedByUserIdAsync(userId, page, pageSize, cancellationToken);

        var documentDtos = documents.Select(MapToDto);

        return new DocumentListDto(documentDtos, totalCount, page, pageSize);
    }

    public async Task<DocumentDetailDto?> GetDocumentAsync(Guid documentId, Guid userId, CancellationToken cancellationToken = default)
    {
        var document = await _documentRepository.GetByIdAsync(documentId, cancellationToken);

        if (document == null || document.UserId != userId)
        {
            return null;
        }

        return new DocumentDetailDto(
            document.Id,
            document.Title,
            document.FileName,
            document.ContentType,
            document.FileSize,
            document.UploadedAt,
            document.IsProcessed,
            MapStatusToDto(document.Status),
            document.ProcessedAt
        );
    }

    public async Task<UploadDocumentResponse> CreateDocumentAsync(
        Guid userId,
        string originalFileName,
        string contentType,
        long fileSize,
        Stream fileStream,
        CancellationToken cancellationToken = default)
    {
        var id = Guid.NewGuid();
        var fileExtension = Path.GetExtension(originalFileName);
        var storedFileName = $"{id}{fileExtension}";
        var uploadPath = Path.Combine(Directory.GetCurrentDirectory(), "uploads", "documents");

        Directory.CreateDirectory(uploadPath);
        var filePath = Path.Combine(uploadPath, storedFileName);

        await using (var outputStream = new FileStream(filePath, FileMode.Create))
        {
            await fileStream.CopyToAsync(outputStream, cancellationToken);
        }

        var title = Path.GetFileNameWithoutExtension(originalFileName);
        var document = new Document
        {
            Id = id,
            Title = title,
            FileName = storedFileName,
            ContentType = contentType,
            FileSize = fileSize,
            FilePath = filePath,
            UserId = userId,
            UploadedAt = DateTime.UtcNow,
            Status = DocumentStatus.Pending,
            IsProcessed = false
        };

        await _documentRepository.CreateAsync(document, cancellationToken);

        return new UploadDocumentResponse(
            document.Id,
            document.Title,
            document.FileName,
            document.ContentType,
            document.FileSize,
            document.UploadedAt,
            document.IsProcessed,
            MapStatusToDto(document.Status)
        );
    }

    public async Task<bool> DeleteDocumentAsync(Guid documentId, Guid userId, CancellationToken cancellationToken = default)
    {
        var document = await _documentRepository.GetByIdAsync(documentId, cancellationToken);

        if (document == null || document.UserId != userId)
        {
            return false;
        }

        if (File.Exists(document.FilePath))
        {
            File.Delete(document.FilePath);
        }

        await _documentRepository.DeleteAsync(documentId, cancellationToken);
        return true;
    }

    public async Task<DocumentDto?> UpdateDocumentStatusAsync(Guid documentId, Guid userId, DocumentStatusDto status, CancellationToken cancellationToken = default)
    {
        var document = await _documentRepository.GetByIdAsync(documentId, cancellationToken);

        if (document == null || document.UserId != userId)
        {
            return null;
        }

        document.Status = MapStatusFromDto(status);
        document.IsProcessed = status == DocumentStatusDto.Completed;
        document.ProcessedAt = status == DocumentStatusDto.Completed ? DateTime.UtcNow : null;

        await _documentRepository.UpdateAsync(document, cancellationToken);

        return MapToDto(document);
    }

    private static DocumentDto MapToDto(Document document)
    {
        return new DocumentDto(
            document.Id,
            document.Title,
            document.FileName,
            document.ContentType,
            document.FileSize,
            document.UploadedAt,
            document.IsProcessed,
            MapStatusToDto(document.Status)
        );
    }

    private static DocumentStatusDto MapStatusToDto(DocumentStatus status)
    {
        return status switch
        {
            DocumentStatus.Pending => DocumentStatusDto.Pending,
            DocumentStatus.Processing => DocumentStatusDto.Processing,
            DocumentStatus.Completed => DocumentStatusDto.Completed,
            DocumentStatus.Failed => DocumentStatusDto.Failed,
            _ => DocumentStatusDto.Pending
        };
    }

    private static DocumentStatus MapStatusFromDto(DocumentStatusDto status)
    {
        return status switch
        {
            DocumentStatusDto.Pending => DocumentStatus.Pending,
            DocumentStatusDto.Processing => DocumentStatus.Processing,
            DocumentStatusDto.Completed => DocumentStatus.Completed,
            DocumentStatusDto.Failed => DocumentStatus.Failed,
            _ => DocumentStatus.Pending
        };
    }
}