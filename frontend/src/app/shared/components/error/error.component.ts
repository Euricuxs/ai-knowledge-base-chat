import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-error',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="error-container">
      <mat-icon class="error-icon">error_outline</mat-icon>
      <h3>{{ title }}</h3>
      <p>{{ message }}</p>
      @if (showRetry) {
        <button mat-raised-button color="primary" (click)="retry.emit()">
          <mat-icon>refresh</mat-icon>
          Retry
        </button>
      }
    </div>
  `,
  styles: [`
    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      text-align: center;
    }

    .error-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #f44336;
      opacity: 0.6;
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
export class ErrorComponent {
  @Input() title = 'Something went wrong';
  @Input() message = 'An error occurred while loading data.';
  @Input() showRetry = false;
  @Output() retry = new EventEmitter<void>();
}