import { Component, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpRequest, HttpEventType, HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../shared/services/auth.service';
import { ThemeService } from '../shared/services/theme.service';
import { environment } from '../../environments/environment';

interface Document {
  id: string;
  title: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  uploadedAt: string;
  isProcessed: boolean;
  status: string;
}

interface UploadState {
  file: File | null;
  progress: number;
  error: string | null;
  uploading: boolean;
}

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatTableModule,
    MatMenuModule,
    MatPaginatorModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatProgressBarModule
  ],
  template: `
    <div class="documents-layout">
      <mat-toolbar color="primary" class="navbar">
        <a mat-icon-button routerLink="/dashboard" class="back-btn">
          <mat-icon>arrow_back</mat-icon>
        </a>
        <span class="logo">Documents</span>
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

      <div class="documents-content">
        <mat-card class="documents-header">
          <div class="header-content">
            <div class="header-text">
              <h2>Knowledge Base Documents</h2>
              <p>Upload and manage your documents for AI knowledge base</p>
            </div>
            <button mat-raised-button color="primary" class="upload-btn" (click)="fileInput.click()">
              <mat-icon>upload</mat-icon>
              <span class="btn-label">Upload Document</span>
            </button>
            <input #fileInput type="file" hidden (change)="onFileSelected($event)" accept=".pdf" />
          </div>
        </mat-card>

        <mat-card
          class="upload-zone"
          [class.drag-over]="isDragOver()"
          [class.has-file]="uploadState().file !== null"
          (dragover)="onDragOver($event)"
          (dragleave)="onDragLeave($event)"
          (drop)="onDrop($event)"
          (click)="fileInput.click()">
          <input #fileInput type="file" hidden (change)="onFileSelected($event)" accept=".pdf" />

          @if (uploadState().uploading) {
            <div class="upload-progress">
              <mat-progress-bar mode="determinate" [value]="uploadState().progress"></mat-progress-bar>
              <p class="upload-filename">{{ uploadState().file?.name }}</p>
              <p class="upload-percent">{{ uploadState().progress | number:'1.0-0' }}%</p>
            </div>
          } @else if (uploadState().file) {
            <div class="upload-ready">
              <mat-icon class="upload-file-icon">description</mat-icon>
              <div class="upload-file-info">
                <p class="upload-filename">{{ uploadState().file?.name }}</p>
                <p class="upload-size">{{ formatFileSize(uploadState().file?.size ?? 0) }}</p>
              </div>
              <button mat-icon-button class="clear-btn" (click)="clearUpload($event)">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <button mat-raised-button color="primary" class="upload-submit-btn" (click)="uploadFile($event)">
              <mat-icon>cloud_upload</mat-icon>
              Upload
            </button>
          } @else {
            <div class="upload-placeholder">
              <mat-icon class="upload-icon">cloud_upload</mat-icon>
              <h3>Drag and drop PDF here</h3>
              <p>or tap to browse &mdash; max 20 MB</p>
            </div>
          }

          @if (uploadState().error) {
            <div class="upload-error">
              <mat-icon>error</mat-icon>
              <span>{{ uploadState().error }}</span>
            </div>
          }
        </mat-card>

        @if (loading()) {
          <div class="loading-state">
            <mat-spinner diameter="48"></mat-spinner>
            <p>Loading documents...</p>
          </div>
        } @else if (documents().length === 0) {
          <mat-card class="empty-state">
            <mat-icon class="empty-icon">folder_open</mat-icon>
            <h3>No documents yet</h3>
            <p>Upload your first document to get started</p>
          </mat-card>
        } @else {
          <mat-card class="documents-table-card">
            <div class="table-scroll">
              <table mat-table [dataSource]="documents()" class="documents-table">
                <ng-container matColumnDef="title">
                  <th mat-header-cell *matHeaderCellDef>Title</th>
                  <td mat-cell *matCellDef="let doc">{{ doc.title }}</td>
                </ng-container>

                <ng-container matColumnDef="fileName">
                  <th mat-header-cell *matHeaderCellDef>File Name</th>
                  <td mat-cell *matCellDef="let doc">{{ doc.fileName }}</td>
                </ng-container>

                <ng-container matColumnDef="contentType">
                  <th mat-header-cell *matHeaderCellDef>Type</th>
                  <td mat-cell *matCellDef="let doc">
                    <mat-chip>{{ getFileExtension(doc.contentType) }}</mat-chip>
                  </td>
                </ng-container>

                <ng-container matColumnDef="fileSize">
                  <th mat-header-cell *matHeaderCellDef>Size</th>
                  <td mat-cell *matCellDef="let doc">{{ formatFileSize(doc.fileSize) }}</td>
                </ng-container>

                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Status</th>
                  <td mat-cell *matCellDef="let doc">
                    <mat-chip [color]="getStatusColor(doc.status)" highlighted>
                      {{ getStatusLabel(doc.status) }}
                    </mat-chip>
                  </td>
                </ng-container>

                <ng-container matColumnDef="uploadedAt">
                  <th mat-header-cell *matHeaderCellDef>Uploaded</th>
                  <td mat-cell *matCellDef="let doc">{{ formatDate(doc.uploadedAt) }}</td>
                </ng-container>

                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef>Actions</th>
                  <td mat-cell *matCellDef="let doc">
                    <button mat-icon-button [matMenuTriggerFor]="docMenu">
                      <mat-icon>more_vert</mat-icon>
                    </button>
                    <mat-menu #docMenu="matMenu">
                      <button mat-menu-item (click)="viewDocument(doc.id)">
                        <mat-icon>visibility</mat-icon>
                        <span>View Details</span>
                      </button>
                      <button mat-menu-item (click)="deleteDocument(doc.id)">
                        <mat-icon>delete</mat-icon>
                        <span>Delete</span>
                      </button>
                    </mat-menu>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              </table>
            </div>

            <mat-paginator
              [length]="totalCount()"
              [pageSize]="pageSize"
              [pageSizeOptions]="[5, 10, 25, 50]"
              (page)="onPageChange($event)"
              showFirstLastButtons>
            </mat-paginator>
          </mat-card>
        }
      </div>
    </div>
  `,
  styles: [`
    .documents-layout {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .navbar {
      display: flex;
      gap: 8px;
    }

    .logo {
      font-size: 20px;
      font-weight: 500;
    }

    .spacer {
      flex: 1;
    }

    .back-btn {
      display: flex;
    }

    .documents-content {
      flex: 1;
      padding: 32px;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
    }

    .documents-header {
      margin-bottom: 24px;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;

      h2 {
        margin: 0 0 4px 0;
        font-size: 20px;
        font-weight: 500;
      }

      p {
        margin: 0;
        opacity: 0.7;
      }
    }

    .upload-zone {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px;
      margin-bottom: 24px;
      border: 2px dashed var(--border-color, #e0e0e0);
      border-radius: 8px;
      cursor: pointer;
      transition: border-color 0.2s, background-color 0.2s;
      min-height: 120px;
      position: relative;

&.drag-over {
        border-color: var(--primary-color, #3f51b5);
        background-color: var(--hover-color, rgba(63, 81, 181, 0.04));
      }

      &.has-file {
        border-style: solid;
        border-color: var(--primary-color, #3f51b5);
      }
    }

    .upload-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;

      .upload-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        opacity: 0.4;
        margin-bottom: 8px;
      }

      h3 {
        margin: 0 0 4px 0;
        font-size: 16px;
        font-weight: 500;
      }

      p {
        margin: 0;
        opacity: 0.6;
        font-size: 14px;
      }
    }

    .upload-progress {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;

      mat-progress-bar {
        width: 100%;
        max-width: 400px;
      }

      .upload-filename {
        margin: 0;
        font-size: 14px;
        font-weight: 500;
        word-break: break-all;
        text-align: center;
      }

      .upload-percent {
        margin: 0;
        font-size: 12px;
        opacity: 0.7;
      }
    }

    .upload-ready {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      margin-bottom: 12px;

      .upload-file-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
        color: var(--primary-color, #3f51b5);
        flex-shrink: 0;
      }

      .upload-file-info {
        flex: 1;
        min-width: 0;

        .upload-filename {
          margin: 0;
          font-size: 14px;
          font-weight: 500;
          word-break: break-all;
        }

        .upload-size {
          margin: 0;
          font-size: 12px;
          opacity: 0.6;
        }
      }

      .clear-btn {
        flex-shrink: 0;
      }
    }

    .upload-error {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      color: #f44336;
      font-size: 14px;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      gap: 16px;

      p {
        opacity: 0.7;
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      text-align: center;

      .empty-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        opacity: 0.3;
        margin-bottom: 16px;
      }

      h3 {
        margin: 0 0 8px 0;
      }

      p {
        margin: 0;
        opacity: 0.7;
      }
    }

    .documents-table-card {
      overflow: hidden;
    }

    .table-scroll {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .documents-table {
      width: 100%;
      min-width: 600px;
    }

    mat-paginator {
      border-top: 1px solid rgba(0, 0, 0, 0.12);
    }

    @media (max-width: 768px) {
      .documents-content {
        padding: 16px;
      }

      .header-content {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
      }

      .header-text {
        h2 {
          font-size: 18px;
        }

        p {
          font-size: 13px;
        }
      }

      .upload-btn {
        width: 100%;
        justify-content: center;
      }

      .upload-zone {
        padding: 20px;
      }

      .upload-ready {
        flex-wrap: wrap;
      }

      .upload-submit-btn {
        width: 100%;
        justify-content: center;
      }

      .documents-table {
        font-size: 13px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentsComponent implements OnInit {
  documents = signal<Document[]>([]);
  loading = signal(true);
  totalCount = signal(0);
  pageSize = 10;
  currentPage = 1;
  isDragOver = signal(false);
  uploadState = signal<UploadState>({ file: null, progress: 0, error: null, uploading: false });

  displayedColumns = ['title', 'fileName', 'contentType', 'fileSize', 'status', 'uploadedAt', 'actions'];

  constructor(
    public authService: AuthService,
    public themeService: ThemeService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.loading.set(true);
    this.http.get<{ documents: Document[]; totalCount: number }>(
      `${environment.apiUrl}/documents?page=${this.currentPage}&pageSize=${this.pageSize}`
    ).subscribe({
      next: (response) => {
        this.documents.set(response.documents);
        this.totalCount.set(response.totalCount);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load documents', err);
        this.loading.set(false);
      }
    });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    const files = event.dataTransfer?.files;
    if (files?.length) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    this.handleFile(input.files[0]);
    input.value = '';
  }

  private handleFile(file: File): void {
    this.uploadState.set({ file: null, progress: 0, error: null, uploading: false });

    if (file.type !== 'application/pdf') {
      this.uploadState.set({ file: null, progress: 0, error: 'Only PDF files are allowed', uploading: false });
      return;
    }

    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      this.uploadState.set({ file: null, progress: 0, error: 'File size exceeds 20 MB limit', uploading: false });
      return;
    }

    this.uploadState.set({ file, progress: 0, error: null, uploading: false });
  }

  clearUpload(event: Event): void {
    event.stopPropagation();
    this.uploadState.set({ file: null, progress: 0, error: null, uploading: false });
  }

  uploadFile(event: Event): void {
    event.stopPropagation();
    const state = this.uploadState();
    if (!state.file) return;

    this.uploadState.set({ ...state, uploading: true, progress: 0, error: null });

    const formData = new FormData();
    formData.append('file', state.file);

    const req = new HttpRequest('POST', `${environment.apiUrl}/documents/upload`, formData, {
      reportProgress: true
    });

    this.http.request(req).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const progress = Math.round((event.loaded / event.total) * 100);
          this.uploadState.update(s => ({ ...s, progress }));
        } else if (event.type === HttpEventType.Response) {
          const newDoc = event.body as Document;
          this.documents.update(docs => [newDoc, ...docs]);
          this.totalCount.update(c => c + 1);
          this.uploadState.set({ file: null, progress: 0, error: null, uploading: false });
          this.pollDocumentStatus(newDoc.id);
        }
      },
      error: (err: HttpErrorResponse) => {
        const message = err.error?.message || 'Upload failed. Please try again.';
        this.uploadState.update(s => ({ ...s, uploading: false, progress: 0, error: message }));
      }
    });
  }

  viewDocument(id: string): void {
    this.http.get<Document>(`${environment.apiUrl}/documents/${id}`).subscribe({
      next: (doc) => {
        const size = this.formatFileSize(doc.fileSize);
        const date = this.formatDate(doc.uploadedAt);
        alert(`Title: ${doc.title}\nFile: ${doc.fileName}\nSize: ${size}\nType: ${doc.contentType}\nUploaded: ${date}\nStatus: ${doc.status}`);
      },
      error: (err) => console.error('Failed to load document', err)
    });
  }

  private pollDocumentStatus(id: string): void {
    const interval = setInterval(() => {
      this.http.get<Document>(`${environment.apiUrl}/documents/${id}`).subscribe({
        next: (doc) => {
          const status = String(doc.status);
          if (status === 'Completed' || status === 'Failed') {
            clearInterval(interval);
            this.documents.update(docs => docs.map(d => d.id === id ? doc : d));
          }
        },
        error: () => clearInterval(interval)
      });
    }, 2000);
  }

  deleteDocument(id: string): void {
    if (!confirm('Are you sure you want to delete this document?')) return;

    this.http.delete(`${environment.apiUrl}/documents/${id}`).subscribe({
      next: () => {
        this.documents.update(docs => docs.filter(d => d.id !== id));
        this.totalCount.update(c => c - 1);
      },
      error: (err) => console.error('Failed to delete document', err)
    });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadDocuments();
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  getFileExtension(contentType: string): string {
    const map: Record<string, string> = {
      'application/pdf': 'PDF'
    };
    return map[contentType] || contentType.split('/')[1]?.toUpperCase() || 'FILE';
  }

  getStatusColor(status: string): 'primary' | 'accent' | 'warn' {
    switch (status) {
      case 'Completed': return 'primary';
      case 'Processing': return 'accent';
      case 'Failed': return 'warn';
      default: return 'primary';
    }
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      '0': 'Pending',
      '1': 'Processing',
      '2': 'Completed',
      '3': 'Failed',
      'Pending': 'Pending',
      'Processing': 'Processing',
      'Completed': 'Completed',
      'Failed': 'Failed'
    };
    return map[status] ?? status;
  }
}
