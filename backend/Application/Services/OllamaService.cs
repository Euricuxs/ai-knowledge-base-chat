using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;

namespace Application.Services;

public record OllamaChatMessage(string Role, string Content);

public interface IOllamaService
{
    Task<string> GenerateResponseAsync(IEnumerable<OllamaChatMessage> messages, CancellationToken cancellationToken = default);
    IAsyncEnumerable<string> StreamResponseAsync(IEnumerable<OllamaChatMessage> messages, CancellationToken cancellationToken = default);
    Task<float[]> GenerateEmbeddingAsync(string text, CancellationToken cancellationToken = default);
}

public class OllamaService : IOllamaService
{
    private readonly HttpClient _httpClient;
    private readonly string _model;
    private readonly double _temperature;
    private readonly int _maxTokens;
    private readonly JsonSerializerOptions _jsonOptions;

    public OllamaService(
        HttpClient httpClient,
        IConfiguration configuration)
    {
        _httpClient = httpClient;
        _httpClient.BaseAddress = new Uri(configuration["Ollama:BaseUrl"] ?? "http://localhost:11434");
        _model = configuration["Ollama:Model"] ?? "llama3.2:latest";
        _temperature = double.Parse(configuration["Ollama:Temperature"] ?? "0.7");
        _maxTokens = int.Parse(configuration["Ollama:MaxTokens"] ?? "2048");

        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };
    }

    public async Task<string> GenerateResponseAsync(IEnumerable<OllamaChatMessage> messages, CancellationToken cancellationToken = default)
    {
        var request = new OllamaGenerateRequest
        {
            Model = _model,
            Messages = messages.Select(m => new OllamaMessage { Role = m.Role, Content = m.Content }).ToList(),
            Stream = false,
            Options = new OllamaOptions
            {
                Temperature = _temperature,
                NumPredict = _maxTokens
            }
        };

        var response = await _httpClient.PostAsJsonAsync("/api/chat", request, cancellationToken);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<OllamaGenerateResponse>(_jsonOptions, cancellationToken);
        return result?.Message?.Content ?? string.Empty;
    }

    public async IAsyncEnumerable<string> StreamResponseAsync(IEnumerable<OllamaChatMessage> messages, [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var request = new OllamaGenerateRequest
        {
            Model = _model,
            Messages = messages.Select(m => new OllamaMessage { Role = m.Role, Content = m.Content }).ToList(),
            Stream = true,
            Options = new OllamaOptions
            {
                Temperature = _temperature,
                NumPredict = _maxTokens
            }
        };

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "/api/chat");
        httpRequest.Content = JsonContent.Create(request);

        var response = await _httpClient.SendAsync(httpRequest, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        response.EnsureSuccessStatusCode();

        using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var reader = new StreamReader(stream);

        while (!cancellationToken.IsCancellationRequested)
        {
            var line = await reader.ReadLineAsync(cancellationToken);
            if (line == null) break;
            if (string.IsNullOrEmpty(line)) continue;

            string? content = null;
            bool isDone = false;

            try
            {
                var chunk = JsonSerializer.Deserialize<OllamaStreamResponse>(line, _jsonOptions);
                content = chunk?.Message?.Content;
                isDone = chunk?.Done == true;
            }
            catch
            {
            }

            if (content != null)
            {
                yield return content;
            }

            if (isDone) yield break;
        }
    }

    private class OllamaGenerateRequest
    {
        public string Model { get; set; } = string.Empty;
        public List<OllamaMessage> Messages { get; set; } = new();
        public bool Stream { get; set; }
        public OllamaOptions? Options { get; set; }
    }

    private class OllamaMessage
    {
        public string Role { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
    }

    private class OllamaOptions
    {
        public double Temperature { get; set; }
        public int NumPredict { get; set; }
    }

    private class OllamaGenerateResponse
    {
        public OllamaMessage? Message { get; set; }
    }

    private class OllamaStreamResponse
    {
        public OllamaMessage? Message { get; set; }
        public bool Done { get; set; }
    }

    private class OllamaEmbeddingRequest
    {
        public string Model { get; set; } = string.Empty;
        public string Prompt { get; set; } = string.Empty;
    }

    private class OllamaEmbeddingResponse
    {
        public float[]? Embedding { get; set; }
    }

    public async Task<float[]> GenerateEmbeddingAsync(string text, CancellationToken cancellationToken = default)
    {
        var request = new OllamaEmbeddingRequest
        {
            Model = _model,
            Prompt = text
        };

        var response = await _httpClient.PostAsJsonAsync("/api/embeddings", request, cancellationToken);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<OllamaEmbeddingResponse>(_jsonOptions, cancellationToken);
        return result?.Embedding ?? Array.Empty<float>();
    }
}