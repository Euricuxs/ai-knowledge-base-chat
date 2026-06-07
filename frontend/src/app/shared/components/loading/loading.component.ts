import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatProgressBarModule],
  template: `
    <div class="loading-container">
      <mat-card class="loading-card">
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
        <p>{{ message }}</p>
      </mat-card>
    </div>
  `,
  styles: [`
    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 200px;
    }

    .loading-card {
      padding: 24px;
      text-align: center;
      min-width: 200px;

      p {
        margin-top: 16px;
        opacity: 0.7;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingComponent {
  @Input() message = 'Loading...';
}