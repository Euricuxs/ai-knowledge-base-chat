# AI Knowledge Base Chat

![Angular](https://img.shields.io/badge/Angular-20-red)
![.NET](https://img.shields.io/badge/.NET-10-purple)
![SQLite](https://img.shields.io/badge/SQLite-blue)
![Ollama](https://img.shields.io/badge/Ollama-Local_LLM-green)

<img width="1365" height="678" alt="image" src="https://github.com/user-attachments/assets/fd7cb343-a6fb-4c87-9084-916311a586ab" />

Document-grounded AI chat application. Upload PDFs, ask questions, and get answers grounded in your documents using RAG (Retrieval Augmented Generation).

## Why This Project

This project explores how Retrieval Augmented Generation (RAG) can improve AI responses by grounding answers in uploaded documents instead of relying solely on model knowledge.

## Technical Challenges

### Building Semantic Search Without a Vector Database

Challenge:
SQLite does not provide native vector search.

Solution:
Stored document embeddings in SQLite and implemented cosine similarity ranking in the application layer to retrieve the top 5 most relevant chunks for each query.

### Selecting a Reliable PDF Text Extraction Strategy

Challenge:
PdfSharpCore returned PDF operators instead of clean text, making extracted content unusable for embeddings.

Solution:
Replaced PdfSharpCore with PdfPig, which provides reliable text extraction for text-based PDF documents.

### Preventing Context Duplication in LLM Prompts

`BuildMessages` used `TakeLast(11)` which already includes the last user message, then added it again separately. The prompt sent to Ollama had a duplicate user message, causing repeated response fragments.

Fixed by skipping the last item before adding the current message:
```csharp
var priorMessages = allPrior.Take(allPrior.Count - 1); // skip duplicate
```

### Handling Incremental Streaming Responses

`XMLHttpRequest.responseText` accumulates all received data. The old frontend code split the entire response on every `onprogress` call and reprocessed every line — including already-processed ones. Result: `JSONJSON WebJSON Web Token...`.

Fixed by tracking position and only parsing new data:
```typescript
let lastProcessedIndex = 0;
while (lastProcessedIndex < responseText.length) {
  const delimIndex = responseText.indexOf('\n\n', lastProcessedIndex);
  if (delimIndex === -1) break;
  lastProcessedIndex = delimIndex + 2; // advance past this event
}
```

### Timestamp Jumps After Streaming

Streaming messages were created with `new Date()` (local time). After completion, `loadMessages` returned timestamps from `DateTime.UtcNow` (UTC). The clock jumped hours on completion.

Fixed by treating all datetime strings as UTC:
```typescript
const date = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
```

### Constructing Relevant Context for RAG

Challenge:
Large documents contain many chunks, but only a small subset should be sent to the LLM.

Solution:
Implemented embedding-based retrieval and selected the top 5 most relevant chunks before injecting them into the prompt, reducing irrelevant context and improving answer quality.

## Core Features

- User authentication and authorization
- PDF upload and processing
- Document chunking and embedding generation
- Semantic search using cosine similarity
- Multi-session chat management
- Real-time AI response streaming
- Responsive UI with light and dark theme support

## Key Technical Achievements

- Implemented Retrieval Augmented Generation (RAG) pipeline
- Built semantic search using vector embeddings and cosine similarity
- Implemented JWT authentication with refresh token support
- Developed real-time streaming chat using Server-Sent Events (SSE)
- Applied Clean Architecture across frontend and backend
- Integrated local LLM inference using Ollama

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Angular 20 · Angular Material · Angular Signals |
| Backend | .NET 10 ASP.NET Core Web API |
| Database | SQLite with Entity Framework Core 10 |
| AI | Ollama + llama3.2 + local embeddings |
| PDF | PdfPig (text extraction) |

## Features

- **RAG-Powered Chat** — Answers are generated from uploaded documents, not general model knowledge
- **PDF Upload & Processing** — Automatic text extraction, cleaning, chunking, and embedding
- **Semantic Search** — Cosine similarity search across document chunks
- **Streaming Responses** — Real-time SSE streaming from Ollama
- **Chat Sessions** — Create, manage, and continue conversations
- **Document Management** — Upload, preview, and delete PDFs
- **Authentication** — JWT-based auth with access + refresh tokens

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Node.js 20+](https://nodejs.org/)
- [Angular CLI 20](https://angular.io/guide/setup-local)
- [Ollama](https://ollama.com/) with `llama3.2:latest` model pulled

```bash
ollama serve
ollama pull llama3.2:latest
```

## Setup

**Backend:**

```bash
cd backend
dotnet restore
dotnet build
dotnet run --project API
```

**Frontend:**

```bash
cd frontend
npm install
ng serve
```

Open `http://localhost:4200` in your browser.

## How It Works

1. **Upload** — Upload a PDF document. Text is extracted and split into ~800-character chunks.
2. **Embed** — Each chunk is embedded using Ollama's `/api/embeddings` endpoint.
3. **Ask** — Type a question. It's embedded and searched against all your chunks via cosine similarity.
4. **Answer** — Top 5 relevant chunks are injected as context. Ollama generates an answer with source citations.

## Architecture

### System Architecture

```text
┌─────────────────────┐
│   Angular 20 UI     │
│                     │
│ • Authentication    │
│ • Documents         │
│ • Chat Sessions     │
│ • Streaming Chat    │
└──────────┬──────────┘
           │ HTTP/SSE
           ▼
┌─────────────────────┐
│ ASP.NET Core API    │
│                     │
│ • JWT Auth          │
│ • Document Upload   │
│ • RAG Pipeline      │
│ • Chat Endpoints    │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     ▼           ▼
┌──────────┐ ┌──────────┐
│ SQLite   │ │ Ollama   │
│          │ │          │
│ Users    │ │ Llama3.2 │
│ Chats    │ │ Embedding│
│ Documents│ │ Generate │
│ Chunks   │ │ Response │
└──────────┘ └──────────┘
```

### RAG Flow

```text
PDF Upload
    │
    ▼
PdfPig Text Extraction
    │
    ▼
Text Cleaning
    │
    ▼
Chunk Generation
(~800 characters)
    │
    ▼
Embedding Generation
(Ollama)
    │
    ▼
Store Chunks + Embeddings
(SQLite)
    │
    ▼
User Question
    │
    ▼
Question Embedding
    │
    ▼
Cosine Similarity Search
    │
    ▼
Top 5 Relevant Chunks
    │
    ▼
Context Injection
    │
    ▼
Ollama Response
    │
    ▼
Streaming Answer (SSE)
```

### Database Relationships

```text
User
├── ChatSession
│   └── ChatMessage
│
├── Document
│   └── DocumentChunk
│
└── RefreshToken
```

## Project Structure

```
backend/
├── API              # Controllers, middleware, endpoints
├── Application      # Use cases, services, DTOs
├── Domain           # Entities and business rules
└── Infrastructure   # EF Core, repositories, external services

frontend/src/app/
├── auth/             # Login, register
├── dashboard/        # Main dashboard
├── chat/            # Chat interface
├── documents/       # Document management
└── shared/          # Services, guards, interceptors
```

## Screenshots

### Login Page (include dark mode)
<img width="1365" height="675" alt="image" src="https://github.com/user-attachments/assets/c888cd65-4c17-463b-9685-aead1553a195" />
<img width="1363" height="678" alt="image" src="https://github.com/user-attachments/assets/e6c1b458-9782-4647-9ad6-683ab57c4ac1" />

### Chat page (include dark mode)
<img width="1365" height="679" alt="image" src="https://github.com/user-attachments/assets/e7c3dc68-7a85-4331-ac7d-dd51514ab0d7" />
<img width="1365" height="678" alt="image" src="https://github.com/user-attachments/assets/1d1fef5f-81d6-4761-8b6f-bd5a115ceece" />

### Document page
<img width="1365" height="678" alt="image" src="https://github.com/user-attachments/assets/8aedcced-8c3a-4159-b206-8cf73ab39852" />
<img width="1365" height="676" alt="image" src="https://github.com/user-attachments/assets/89e33948-5842-441d-be8f-cac685ff30ad" />

## Demo

### Document Upload

Upload a PDF document, extract text, generate chunks, and create embeddings.

https://github.com/user-attachments/assets/40f538c4-3eb9-4eb5-b4ea-f126e3e6d3c3

### AI Chat

Ask questions about uploaded documents and receive context-aware responses powered by RAG.

https://github.com/user-attachments/assets/085c8ca0-798d-4f7c-aadf-4d9e503bd26b

## Limitations

- PDF text extraction only works on text-based PDFs (not scanned/image PDFs)
- Embeddings stored as JSON in SQLite (no native vector DB)
- Ollama must be running locally for AI features

## Future Improvements

- PostgreSQL + pgvector
- OCR support for scanned PDFs
- Hybrid search
- Source highlighting
- Multiple LLM support

## License

MIT
