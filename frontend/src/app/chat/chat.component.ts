import { Component, ChangeDetectionStrategy, OnInit, signal, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../shared/services/auth.service';
import { ThemeService } from '../shared/services/theme.service';
import { environment } from '../../environments/environment';

interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'streaming';
  createdAt: string;
  sources?: SourceRef[];
}

interface SourceRef {
  documentId: string;
  documentName: string;
  chunkIndex: number;
}

interface RagStatus {
  indexedDocuments: number;
  totalChunks: number;
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string | null;
  messageCount: number;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatInputModule,
    MatFormFieldModule,
    MatListModule,
    MatMenuModule,
    MatDividerModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="chat-layout" [class.sidebar-opened]="sidebarOpen()">
      <mat-toolbar color="primary" class="navbar">
        <a mat-icon-button routerLink="/dashboard" class="back-btn">
          <mat-icon>arrow_back</mat-icon>
        </a>

        <button mat-icon-button (click)="toggleSidebar()" class="menu-btn">
          <mat-icon>menu</mat-icon>
        </button>

        <span class="logo">Chat</span>
        @if (ragStatus() && ragStatus()!.indexedDocuments > 0) {
          <span class="rag-indicator" title="Documents indexed for RAG">
            <mat-icon>library_books</mat-icon>
            {{ ragStatus()!.indexedDocuments }} docs · {{ ragStatus()!.totalChunks }} chunks
          </span>
        } @else {
          <span class="rag-indicator rag-indicator--empty" title="Upload documents to enable RAG">
            <mat-icon>library_books</mat-icon>
            no documents
          </span>
        }
        <span class="spacer"></span>
        <button mat-icon-button (click)="themeService.toggleTheme()">
          <mat-icon>{{ themeService.isDarkMode() ? 'light_mode' : 'dark_mode' }}</mat-icon>
        </button>
        <button mat-icon-button [matMenuTriggerFor]="menu">
          <mat-icon>account_circle</mat-icon>
        </button>
        <mat-menu #menu="matMenu">
          <button mat-menu-item (click)="authService.logout()">
            <mat-icon>logout</mat-icon>
            <span>Logout</span>
          </button>
        </mat-menu>
      </mat-toolbar>

      <div class="chat-container">
        <div class="sidebar-overlay" [class.open]="sidebarOpen()" (click)="toggleSidebar()"></div>

        <aside class="sidebar" [class.open]="sidebarOpen()">
          <div class="sidebar-header">
            <div class="sidebar-header-row">
              <button mat-raised-button color="primary" (click)="createNewSession()" class="new-chat-btn">
                <mat-icon>add</mat-icon>
                New Chat
              </button>
              <button mat-icon-button class="close-sidebar-btn" (click)="toggleSidebar()">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          </div>

          <div class="sessions-list">
            @for (session of sessions(); track session.id) {
              <div
                class="session-item"
                [class.active]="currentSessionId() === session.id"
                (click)="selectSession(session.id)">
                <mat-icon>chat_bubble_outline</mat-icon>
                <span class="session-title">{{ session.title }}</span>
                <button mat-icon-button class="delete-btn" (click)="deleteSession($event, session.id)">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            }
          </div>
        </aside>

        <main class="chat-main">
          @if (!currentSessionId()) {
            <div class="empty-state">
              <mat-icon class="empty-icon">chat</mat-icon>
              <h2>Start a new conversation</h2>
              <p>Select a chat session or create a new one to get started</p>
            </div>
          } @else {
            <div class="messages-container" #messagesContainer>
              <div class="messages-list">
                @for (message of messages(); track message.id || $index) {
                  <div class="message" [class.user]="message.role === 'user'" [class.assistant]="message.role === 'assistant'">
                    <div class="message-avatar">
                      <mat-icon>{{ message.role === 'user' ? 'person' : 'smart_toy' }}</mat-icon>
                    </div>
                    <div class="message-content">
                      <div class="message-text">{{ message.content }}</div>
                      @if (message.sources && message.sources.length > 0) {
                        <div class="sources-bar">
                          <span class="sources-label">Sources:</span>
                          @for (source of message.sources; track source.documentId + source.chunkIndex) {
                            <span class="source-chip" [routerLink]="['/documents']" [queryParams]="{docId: source.documentId}">
                              {{ source.documentName }} ({{ source.chunkIndex + 1 }})
                            </span>
                          }
                        </div>
                      }
                      <div class="message-time">{{ formatTime(message.createdAt) }}</div>
                    </div>
                  </div>
                }
                @if (loading()) {
                  <div class="message assistant">
                    <div class="message-avatar">
                      <mat-icon>smart_toy</mat-icon>
                    </div>
                    <div class="message-content">
                      <div class="message-text streaming">
                        <span class="streaming-dot"></span>
                        <span class="streaming-dot"></span>
                        <span class="streaming-dot"></span>
                        Thinking...
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>

            <div class="input-container">
              <mat-form-field appearance="outline" class="message-input">
                <input
                  matInput
                  [(ngModel)]="newMessage"
                  placeholder="Type your message..."
                  (keyup.enter)="sendMessage()"
                  [disabled]="loading()" />
              </mat-form-field>
              <button
                mat-fab
                color="primary"
                (click)="sendMessage()"
                [disabled]="!newMessage.trim() || loading()">
                <mat-icon>send</mat-icon>
              </button>
            </div>
          }
        </main>
      </div>
    </div>
  `,
  styles: [`
    .chat-layout {
      height: 100vh;
      display: flex;
      flex-direction: column;

      @media (max-width: 768px) {
        &.sidebar-opened .chat-main {
          display: none;
        }
      }
    }

    .navbar {
      display: flex;
      gap: 8px;
    }

    .logo {
      font-size: 20px;
      font-weight: 500;
    }

    .rag-indicator {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      opacity: 0.75;
      padding: 4px 10px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 16px;
      margin-left: 8px;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }

      &--empty {
        opacity: 0.5;
      }
    }

    .dark-theme {
      .rag-indicator {
        background: rgba(255, 255, 255, 0.1);
      }
    }

    .spacer {
      flex: 1;
    }

    .back-btn {
      display: flex;
    }

    .menu-btn {
      display: flex;
    }

    .chat-container {
      flex: 1;
      display: flex;
      overflow: hidden;
      position: relative;
    }

    .sidebar-overlay {
      display: none;

      @media (max-width: 768px) {
        display: block;
        position: fixed;
        top: 64px;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 99;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;

        &.open {
          opacity: 1;
          pointer-events: auto;
        }
      }
    }

    .chat-layout {
      height: 100vh;
      display: flex;
      flex-direction: column;

      @media (max-width: 768px) {
        &.sidebar-opened .chat-main {
          display: none;
        }
      }
    }

    .sidebar {
      background: var(--surface-color, #f5f5f5);
      border-right: 1px solid var(--border-color, #e0e0e0);
      display: flex;
      flex-direction: column;
      transition: transform 0.3s ease;

      @media (max-width: 768px) {
        position: absolute;
        height: calc(100% - 64px);
        transform: translateX(-100%);
        z-index: 100;

        &.open {
          transform: translateX(0);
        }
      }
    }

    .sidebar-header {
      padding: 16px;
      border-bottom: 1px solid var(--border-color, #e0e0e0);
    }

    .sidebar-header-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .close-sidebar-btn {
      display: none;

      @media (max-width: 768px) {
        display: flex;
      }
    }

    .new-chat-btn {
      flex: 1;
    }

    .sessions-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .session-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: background-color 0.2s;

      &:hover {
        background: var(--hover-color, rgba(0, 0, 0, 0.04));

        .delete-btn {
          opacity: 1;
        }
      }

      &.active {
        background: var(--active-color, rgba(63, 81, 181, 0.12));
      }

      .session-title {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .delete-btn {
        opacity: 0;
        transition: opacity 0.2s;
      }
    }

    .chat-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 20px;

      .empty-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        opacity: 0.3;
        margin-bottom: 16px;
      }

      h2 {
        margin-bottom: 8px;
        opacity: 0.8;
      }

      p {
        opacity: 0.6;
      }
    }

    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }

    .messages-list {
      max-width: 800px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .message {
      display: flex;
      gap: 16px;
      animation: fadeIn 0.3s ease;

      &.user {
        flex-direction: row-reverse;

        .message-content {
          align-items: flex-end;

          .message-text {
            background: var(--user-message-bg, #e3f2fd);
          }
        }
      }

      &.assistant .message-text {
        background: var(--assistant-message-bg, #f5f5f5);
      }
    }

    .message-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--avatar-bg, #e0e0e0);
      flex-shrink: 0;
    }

    .message-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-width: 70%;
    }

    .message-text {
      padding: 12px 16px;
      border-radius: 12px;
      line-height: 1.5;
      white-space: pre-wrap;
    }

    .message-time {
      font-size: 12px;
      opacity: 0.5;
    }

    .sources-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      padding: 8px 12px;
      background: rgba(63, 81, 181, 0.08);
      border-radius: 8px;
      margin-top: 4px;
    }

    .sources-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      opacity: 0.6;
    }

    .source-chip {
      font-size: 12px;
      padding: 2px 8px;
      background: rgba(63, 81, 181, 0.15);
      border-radius: 12px;
      cursor: pointer;
      transition: background 0.2s;

      &:hover {
        background: rgba(63, 81, 181, 0.3);
      }
    }

    .dark-theme {
      .sources-bar {
        background: rgba(63, 81, 181, 0.2);
      }

      .source-chip {
        background: rgba(63, 81, 181, 0.3);

        &:hover {
          background: rgba(63, 81, 181, 0.45);
        }
      }
    }

    .streaming {
      display: flex;
      align-items: center;
      gap: 4px;

      .streaming-dot {
        width: 8px;
        height: 8px;
        background: #666;
        border-radius: 50%;
        animation: bounce 1.4s infinite ease-in-out;

        &:nth-child(1) { animation-delay: -0.32s; }
        &:nth-child(2) { animation-delay: -0.16s; }
      }
    }

    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .input-container {
      display: flex;
      gap: 16px;
      padding: 16px 20px;
      border-top: 1px solid var(--border-color, #e0e0e0);
      background: var(--surface-color, #ffffff);
      max-width: 800px;
      margin: 0 auto;
      width: 100%;
    }

    .message-input {
      flex: 1;
    }

    .dark-theme {
      --surface-color: #1e1e1e;
      --border-color: #333;
      --hover-color: rgba(255, 255, 255, 0.04);
      --active-color: rgba(63, 81, 181, 0.24);
      --user-message-bg: rgba(63, 81, 181, 0.2);
      --assistant-message-bg: #2d2d2d;
      --avatar-bg: #424242;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  sessions = signal<ChatSession[]>([]);
  messages = signal<ChatMessage[]>([]);
  currentSessionId = signal<string | null>(null);
  loading = signal(false);
  sidebarOpen = signal(true);
  newMessage = '';
  ragStatus = signal<RagStatus | null>(null);

  private shouldScrollToBottom = false;
  private streamingMessageId = 0;

  constructor(
    public authService: AuthService,
    public themeService: ThemeService,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadSessions();
    this.loadRagStatus();

    this.route.params.subscribe(params => {
      if (params['sessionId']) {
        this.currentSessionId.set(params['sessionId']);
        this.loadMessages(params['sessionId']);
      }
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  loadSessions(): void {
    this.http.get<ChatSession[]>(`${environment.apiUrl}/chat/sessions`).subscribe({
      next: (sessions) => this.sessions.set(sessions),
      error: (err) => console.error('Failed to load sessions', err)
    });
  }

  loadRagStatus(): void {
    this.http.get<RagStatus>(`${environment.apiUrl}/documents/rag-status`).subscribe({
      next: (status) => this.ragStatus.set(status),
      error: () => this.ragStatus.set(null)
    });
  }

  loadMessages(sessionId: string): void {
    this.http.get<{ id: string; title: string; messages: ChatMessage[] }>(`${environment.apiUrl}/chat/sessions/${sessionId}`).subscribe({
      next: (session) => {
        this.messages.set(session.messages);
        this.shouldScrollToBottom = true;
      },
      error: (err) => console.error('Failed to load messages', err)
    });
  }

  createNewSession(): void {
    const title = `Chat ${new Date().toLocaleString()}`;
    this.http.post<ChatSession>(`${environment.apiUrl}/chat/sessions`, { title }).subscribe({
      next: (session) => {
        this.sessions.update(sessions => [session, ...sessions]);
        this.selectSession(session.id);
      },
      error: (err) => console.error('Failed to create session', err)
    });
  }

  selectSession(sessionId: string): void {
    this.currentSessionId.set(sessionId);
    this.router.navigate(['/chat', sessionId]);
  }

  deleteSession(event: Event, sessionId: string): void {
    event.stopPropagation();
    this.http.delete(`${environment.apiUrl}/chat/sessions/${sessionId}`).subscribe({
      next: () => {
        this.sessions.update(sessions => sessions.filter(s => s.id !== sessionId));
        if (this.currentSessionId() === sessionId) {
          this.currentSessionId.set(null);
          this.messages.set([]);
          this.router.navigate(['/chat']);
        }
      },
      error: (err) => console.error('Failed to delete session', err)
    });
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || this.loading()) return;

    const sessionId = this.currentSessionId();
    if (!sessionId) return;

    const content = this.newMessage;
    this.newMessage = '';

    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      content,
      role: 'user',
      createdAt: new Date().toISOString()
    };

    this.messages.update(msgs => [...msgs, userMessage]);
    this.loading.set(true);
    this.shouldScrollToBottom = true;

    this.streamMessage(sessionId, content);
  }

  private streamMessage(sessionId: string, content: string): void {
    const request = new XMLHttpRequest();
    const url = `${environment.apiUrl}/chat/messages/stream`;

    request.open('POST', url, true);
    request.setRequestHeader('Content-Type', 'application/json');
    request.setRequestHeader('Authorization', `Bearer ${this.authService.getToken()}`);

    const streamingId = `streaming-${this.streamingMessageId++}`;
    const streamingMessage: ChatMessage = {
      id: streamingId,
      content: '',
      role: 'streaming',
      createdAt: new Date().toISOString()
    };
    this.messages.update(msgs => [...msgs, streamingMessage]);

    let sources: SourceRef[] = [];

    request.onprogress = () => {
      if (request.readyState >= 3) {
        const responseText = request.responseText;
        const lines = responseText.split('\n\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
          const data = line.replace('data: ', '');
          if (data === '[DONE]') continue;
          if (data.startsWith('{"error"')) continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              this.messages.update(msgs => {
                const updated = [...msgs];
                const idx = updated.findIndex(m => m.id === streamingId);
                if (idx !== -1) {
                  updated[idx] = { ...updated[idx], content: updated[idx].content + parsed.content };
                }
                return updated;
              });
              this.shouldScrollToBottom = true;
            }
            if (parsed.sources) {
              sources = parsed.sources;
            }
          } catch {
          }
        }
      }
    };

    request.onload = () => {
      this.loading.set(false);

      if (request.status === 200) {
        this.messages.update(msgs => {
          const updated = msgs.filter(m => m.id !== streamingId);
          this.loadMessages(sessionId);
          return updated;
        });
      } else {
        this.messages.update(msgs => {
          const updated = [...msgs];
          const idx = updated.findIndex(m => m.id === streamingId);
          if (idx !== -1) {
            updated[idx] = { ...updated[idx], content: 'Error: Failed to get response from AI', role: 'assistant' as const, sources };
          }
          return updated;
        });
      }
    };

    request.onerror = () => {
      this.loading.set(false);
      this.messages.update(msgs => {
        const updated = [...msgs];
        const idx = updated.findIndex(m => m.id === streamingId);
        if (idx !== -1) {
          updated[idx] = { ...updated[idx], content: 'Error: Connection failed', role: 'assistant' as const };
        }
        return updated;
      });
    };

    request.send(JSON.stringify({ content, sessionId }));
  }

  toggleSidebar(): void {
    this.sidebarOpen.update(open => !open);
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      const container = this.messagesContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    }
  }
}