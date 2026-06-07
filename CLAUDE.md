# AI Knowledge Base Chat

Full-stack AI-powered knowledge base chat. Angular 20 frontend + .NET 10 ASP.NET Core Web API backend with RAG (Retrieval Augmented Generation) for document-grounded answers.

## Tech Stack

**Frontend:** Angular 20 · Angular Material · Angular Signals · HttpClient + interceptors · Standalone components with lazy loading

**Backend:** .NET 10 ASP.NET Core Web API · Entity Framework Core 10 · SQLite · JWT Bearer auth · PdfPig (text PDFs) · Ollama (LLM + embeddings)

## Architecture

```
backend/
├── API/              # Controllers, middleware, Program.cs
├── Application/      # Services, DTOs, interfaces
├── Domain/           # Entities, enums
└── Infrastructure/  # DbContext, repositories

frontend/src/app/
├── auth/             # Login, register
├── dashboard/        # Main dashboard
├── chat/            # Chat interface (SSE streaming)
├── documents/       # Document management
└── shared/          # Services, guards, interceptors
```

## Running

```
# Backend
cd backend
dotnet restore && dotnet build
dotnet run --project API

# Frontend
cd frontend
npm install && ng serve

# Prerequisites
ollama serve
ollama pull llama3.2:latest
```

## RAG Pipeline

1. User uploads PDF → PdfPig extracts text
2. Text cleaned (whitespace, dedup) and split into ~800-char chunks
3. Each chunk embedded via Ollama `/api/embeddings`, stored as JSON in `DocumentChunks.EmbeddingJson`
4. On chat: question embedded → cosine similarity against user chunks → top 5 chunks injected as context → Ollama generates answer

**Limitations:** Text-based PDFs only (no OCR). Embeddings stored as JSON in SQLite (no native vector DB). In-memory cosine similarity.

---

## Engineering Rules

- Prefer modifying existing code over creating new abstractions.
- Follow existing project patterns.
- Avoid over-engineering.
- Keep methods focused and small.
- Remove dead code and unused imports.
- Prefer composition over inheritance.
- Do not introduce new dependencies unless necessary.
- Prioritize readability and maintainability.

## Comment Rules

- English only.
- Do not comment obvious code.
- Explain business rules, architectural decisions, security considerations, and non-obvious implementation details only.
- Remove redundant comments.
- Avoid tutorial-style comments and AI-generated comment patterns.

## RAG Behavior

- Prioritize document context over model knowledge.
- If information is not found in uploaded documents, state that clearly.
- Do not fabricate answers.
- Cite document sources when available.
- Keep responses concise and factual.

## Code Preferences

### Backend
- Use `async/await` for all I/O with cancellation tokens.
- Use `record` types for DTOs.
- Use file-scoped namespaces.
- Use primary constructors for dependency injection.
- Use `Guid` primary keys with EF Core.

### Frontend
- Use Angular Signals for state management.
- Use standalone components with `OnPush` change detection.
- Prefer strongly typed models.
- Use functional guards and interceptors.
- Avoid unnecessary subscriptions; prefer Signals or `async` pipe.
