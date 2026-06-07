import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
import { AuthService } from '../shared/services/auth.service';
import { ThemeService } from '../shared/services/theme.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatMenuModule,
    MatDividerModule
  ],
  template: `
    <div class="dashboard-layout">
      <mat-toolbar color="primary" class="navbar">
        <span class="logo">AI Knowledge Base</span>
        <span class="spacer"></span>

        <button mat-icon-button (click)="themeService.toggleTheme()">
          <mat-icon>{{ themeService.isDarkMode() ? 'light_mode' : 'dark_mode' }}</mat-icon>
        </button>

        <button mat-icon-button [matMenuTriggerFor]="menu">
          <mat-icon>account_circle</mat-icon>
        </button>

        <mat-menu #menu="matMenu">
          <div class="user-info">
            <strong>{{ authService.user()?.firstName }} {{ authService.user()?.lastName }}</strong>
            <span>{{ authService.user()?.email }}</span>
          </div>
          <mat-divider></mat-divider>
          <button mat-menu-item (click)="authService.logout()">
            <mat-icon>logout</mat-icon>
            <span>Logout</span>
          </button>
        </mat-menu>
      </mat-toolbar>

      <div class="dashboard-content">
        <div class="welcome-section">
          <h1>Welcome, {{ authService.user()?.firstName }}!</h1>
          <p>What would you like to do today?</p>
        </div>

        <div class="cards-grid">
          <mat-card class="dashboard-card" routerLink="/chat">
            <mat-card-header>
              <mat-icon mat-card-avatar>chat</mat-icon>
              <mat-card-title>Chat</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p>Start a conversation with AI about your knowledge base documents</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-button color="primary">Open Chat</button>
            </mat-card-actions>
          </mat-card>

          <mat-card class="dashboard-card" routerLink="/documents">
            <mat-card-header>
              <mat-icon mat-card-avatar>folder</mat-icon>
              <mat-card-title>Documents</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p>Upload and manage your knowledge base documents</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-button color="primary">Manage Documents</button>
            </mat-card-actions>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-layout {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .navbar {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .logo {
      font-size: 20px;
      font-weight: 500;
    }

    .spacer {
      flex: 1;
    }

    .dashboard-content {
      flex: 1;
      padding: 32px;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
    }

    .welcome-section {
      margin-bottom: 32px;

      h1 {
        font-size: 32px;
        font-weight: 500;
        margin-bottom: 8px;
      }

      p {
        font-size: 16px;
        opacity: 0.7;
      }
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
    }

    .dashboard-card {
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;

      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
      }
    }

    .user-info {
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;

      strong {
        font-size: 14px;
      }

      span {
        font-size: 12px;
        opacity: 0.7;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  authService = inject(AuthService);
  themeService = inject(ThemeService);
}