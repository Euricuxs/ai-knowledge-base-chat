using System.Security.Claims;
using Application.DTOs;
using Application.Interfaces;
using Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DocumentsController : ControllerBase
{
    private readonly DocumentService _documentService;
    private readonly DocumentProcessingService _processingService;
    private readonly IDocumentRepository _documentRepository;
    private readonly IServiceScopeFactory _scopeFactory;
    private const long MaxFileSize = 20 * 1024 * 1024;
    private static readonly HashSet<string> AllowedContentTypes = new()
    {
        "application/pdf"
    };

    public DocumentsController(
        DocumentService documentService,
        DocumentProcessingService processingService,
        IDocumentRepository documentRepository,
        IServiceScopeFactory scopeFactory)
    {
        _documentService = documentService;
        _processingService = processingService;
        _documentRepository = documentRepository;
        _scopeFactory = scopeFactory;
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(userIdClaim!);
    }

    [HttpPost("upload")]
    public async Task<ActionResult<UploadDocumentResponse>> UploadDocument(CancellationToken cancellationToken)
    {
        var file = Request.Form.Files.FirstOrDefault();

        if (file == null)
        {
            return BadRequest(new { message = "No file provided" });
        }

        if (!AllowedContentTypes.Contains(file.ContentType))
        {
            return BadRequest(new { message = "Only PDF files are allowed" });
        }

        if (file.Length > MaxFileSize)
        {
            return BadRequest(new { message = "File size exceeds 20 MB limit" });
        }

        await using var stream = file.OpenReadStream();
        var result = await _documentService.CreateDocumentAsync(
            GetUserId(),
            file.FileName,
            file.ContentType,
            file.Length,
            stream,
            cancellationToken);

        _ = Task.Run(async () =>
        {
            using var scope = _scopeFactory.CreateScope();
            var processingService = scope.ServiceProvider.GetRequiredService<DocumentProcessingService>();
            await processingService.ProcessDocumentAsync(result.Id);
        });

        return CreatedAtAction(nameof(GetDocument), new { documentId = result.Id }, result);
    }

    [HttpGet]
    public async Task<ActionResult<DocumentListDto>> GetDocuments(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        var documents = await _documentService.GetDocumentsAsync(GetUserId(), page, pageSize, cancellationToken);
        return Ok(documents);
    }

    [HttpGet("rag-status")]
    public async Task<ActionResult<RagStatusDto>> GetRagStatus(CancellationToken cancellationToken)
    {
        var status = await _documentService.GetRagStatusAsync(GetUserId(), cancellationToken);
        return Ok(status);
    }

    [HttpGet("{documentId:guid}")]
    public async Task<ActionResult<DocumentDetailDto>> GetDocument(Guid documentId, CancellationToken cancellationToken)
    {
        var document = await _documentService.GetDocumentAsync(documentId, GetUserId(), cancellationToken);

        if (document == null)
        {
            return NotFound(new { message = "Document not found" });
        }

        return Ok(document);
    }

    [HttpGet("{documentId:guid}/preview")]
    public async Task<ActionResult<DocumentPreviewDto>> GetDocumentPreview(Guid documentId, CancellationToken cancellationToken)
    {
        var document = await _documentRepository.GetByIdAsync(documentId, cancellationToken);

        if (document == null || document.UserId != GetUserId())
        {
            return NotFound(new { message = "Document not found" });
        }

        var extractResult = DocumentProcessingService.ExtractTextFromPdf(document.FilePath);
        var chunks = DocumentProcessingService.SplitIntoChunks(documentId, extractResult.Text);
        var previewText = extractResult.Text.Length <= 1000
            ? extractResult.Text
            : extractResult.Text.Substring(0, 1000);

        return Ok(new DocumentPreviewDto(
            documentId,
            document.Title,
            extractResult.PageCount,
            extractResult.TextLength,
            previewText,
            chunks.Count
        ));
    }

    [HttpDelete("{documentId:guid}")]
    public async Task<ActionResult> DeleteDocument(Guid documentId, CancellationToken cancellationToken)
    {
        var result = await _documentService.DeleteDocumentAsync(documentId, GetUserId(), cancellationToken);

        if (!result)
        {
            return NotFound(new { message = "Document not found" });
        }

        return NoContent();
    }
}
