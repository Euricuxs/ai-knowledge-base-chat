import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="empty-container">
      <mat-card class="empty-card">
        <mat-icon class="empty-icon">{{ icon }}</mat-icon>
        <h3>{{ title }}</h3>
        <p>{{ message }}</p>
        @if (actionLabel) {
          <button mat-raised-button color="primary" (click)="action.emit()">
            <mat-icon>{{ actionIcon }}</mat-icon>
            {{ actionLabel }}
          </button>
        }
      </mat-card>
    </div>
  `,
  styles: [`
    .empty-container {
      display: flex;
      justify-content: center;
      padding: 48px 20px;
    }

    .empty-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px;
      text-align: center;
      max-width: 400px;
    }

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
      margin: 0 0 24px 0;
      opacity: 0.7;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmptyStateComponent {
  @Input() icon = 'folder_open';
  @Input() title = 'No data';
  @Input() message = 'There is nothing here yet.';
  @Input() actionLabel?: string;
  @Input() actionIcon = 'add';
  @Output() action = new EventEmitter<void>();
}