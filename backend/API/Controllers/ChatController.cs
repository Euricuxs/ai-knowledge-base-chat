using System.Security.Claims;
using System.Text.Json;
using Application.DTOs;
using Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ChatController : ControllerBase
{
    private readonly ChatService _chatService;

    public ChatController(ChatService chatService)
    {
        _chatService = chatService;
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(userIdClaim!);
    }

    [HttpGet("sessions")]
    public async Task<ActionResult<IEnumerable<ChatSessionDto>>> GetSessions(CancellationToken cancellationToken)
    {
        var sessions = await _chatService.GetSessionsAsync(GetUserId(), cancellationToken);
        return Ok(sessions);
    }

    [HttpGet("sessions/{sessionId:guid}")]
    public async Task<ActionResult<ChatSessionDetailDto>> GetSession(Guid sessionId, CancellationToken cancellationToken)
    {
        var session = await _chatService.GetSessionAsync(sessionId, GetUserId(), cancellationToken);

        if (session == null)
        {
            return NotFound(new { message = "Session not found" });
        }

        return Ok(session);
    }

    [HttpPost("sessions")]
    public async Task<ActionResult<ChatSessionDto>> CreateSession([FromBody] CreateChatSessionRequest request, CancellationToken cancellationToken)
    {
        var session = await _chatService.CreateSessionAsync(GetUserId(), request, cancellationToken);
        return CreatedAtAction(nameof(GetSession), new { sessionId = session.Id }, session);
    }

    [HttpPut("sessions/{sessionId:guid}")]
    public async Task<ActionResult<ChatSessionDto>> UpdateSession(Guid sessionId, [FromBody] UpdateChatSessionRequest request, CancellationToken cancellationToken)
    {
        var session = await _chatService.UpdateSessionAsync(sessionId, GetUserId(), request, cancellationToken);

        if (session == null)
        {
            return NotFound(new { message = "Session not found" });
        }

        return Ok(session);
    }

    [HttpDelete("sessions/{sessionId:guid}")]
    public async Task<ActionResult> DeleteSession(Guid sessionId, CancellationToken cancellationToken)
    {
        var result = await _chatService.DeleteSessionAsync(sessionId, GetUserId(), cancellationToken);

        if (!result)
        {
            return NotFound(new { message = "Session not found" });
        }

        return NoContent();
    }

    [HttpPost("messages")]
    public async Task<ActionResult<AiResponseDto>> SendMessage([FromBody] SendMessageRequest request, CancellationToken cancellationToken)
    {
        if (!request.SessionId.HasValue)
        {
            return BadRequest(new { message = "SessionId is required" });
        }

        try
        {
            var userId = GetUserId();

            await _chatService.AddMessageAsync(request.SessionId.Value, userId, request, cancellationToken);
            var aiResponse = await _chatService.GenerateAiResponseAsync(request.SessionId.Value, userId, cancellationToken);

            return Ok(aiResponse);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("messages/stream")]
    public async Task StreamMessage([FromBody] SendMessageRequest request, CancellationToken cancellationToken)
    {
        if (!request.SessionId.HasValue)
        {
            Response.StatusCode = 400;
            await Response.WriteAsJsonAsync(new { message = "SessionId is required" }, cancellationToken);
            return;
        }

        try
        {
            var userId = GetUserId();
            var sessionId = request.SessionId.Value;

            await _chatService.AddMessageAsync(sessionId, userId, request, cancellationToken);

            Response.ContentType = "text/event-stream";
            Response.Headers.CacheControl = "no-cache";
            Response.Headers.Connection = "keep-alive";

            Console.WriteLine($"[ChatController] StreamMessage: starting for session {sessionId}");
            var (stream, sources) = await _chatService.StreamAiResponseWithSourcesAsync(sessionId, userId, cancellationToken);

            await foreach (var chunk in stream)
            {
                if (chunk.Role == "streaming")
                {
                    var json = JsonSerializer.Serialize(new { content = chunk.Content });
                    await Response.WriteAsync($"data: {json}\n\n", cancellationToken);
                    await Response.Body.FlushAsync(cancellationToken);
                }
            }

            Console.WriteLine($"[ChatController] StreamMessage: completed for session {sessionId}, sources: {sources.Count}");

            if (sources.Count > 0)
            {
                var sourcesJson = JsonSerializer.Serialize(new { sources });
                await Response.WriteAsync($"data: {sourcesJson}\n\n", cancellationToken);
            }

            await Response.WriteAsync("data: [DONE]\n\n", cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
        }
        catch (OperationCanceledException)
        {
        }
        catch (Exception ex)
        {
            var json = JsonSerializer.Serialize(new { error = ex.Message });
            await Response.WriteAsync($"data: {json}\n\n", cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
        }
    }
}