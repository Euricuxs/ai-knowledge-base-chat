import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../shared/services/auth.service';
import { ThemeService } from '../../shared/services/theme.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatToolbarModule
  ],
  template: `
    <div class="auth-container">
      <mat-toolbar class="auth-toolbar" color="primary">
        <span class="logo">AI Knowledge Base</span>
        <span class="spacer"></span>
        <button mat-icon-button (click)="themeService.toggleTheme()">
          <mat-icon>{{ themeService.isDarkMode() ? 'light_mode' : 'dark_mode' }}</mat-icon>
        </button>
      </mat-toolbar>

      <mat-card class="auth-card">
        <mat-card-header>
          <mat-card-title>Welcome Back</mat-card-title>
          <mat-card-subtitle>Sign in to your account</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" />
              @if (loginForm.get('email')?.hasError('required')) {
                <mat-error>Email is required</mat-error>
              }
              @if (loginForm.get('email')?.hasError('email')) {
                <mat-error>Please enter a valid email</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput type="password" formControlName="password" />
              @if (loginForm.get('password')?.hasError('required')) {
                <mat-error>Password is required</mat-error>
              }
            </mat-form-field>

            @if (errorMessage()) {
              <div class="error-message">{{ errorMessage() }}</div>
            }

            <button
              mat-raised-button
              color="primary"
              type="submit"
              class="full-width"
              [disabled]="loading()">
              @if (loading()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                Sign In
              }
            </button>
          </form>
        </mat-card-content>

        <mat-card-actions>
          <span>Don't have an account?</span>
          <a mat-button color="primary" routerLink="/auth/register">Register</a>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .auth-toolbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      width: 100%;
      background: transparent !important;
      box-shadow: none !important;
    }

    .logo {
      font-size: 20px;
      font-weight: 500;
    }

    .spacer {
      flex: 1;
    }

    .auth-card {
      max-width: 400px;
      width: 100%;
      padding: 20px;
    }

    mat-card-header {
      margin-bottom: 20px;
    }

    mat-card-title {
      font-size: 24px;
      font-weight: 500;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    button[type="submit"] {
      height: 48px;
      font-size: 16px;
      margin-top: 8px;
    }

    @media (max-width: 480px) {
      .auth-card {
        padding: 16px;
      }

      mat-card-title {
        font-size: 20px;
      }

      .auth-toolbar .logo {
        font-size: 16px;
      }
    }

    .error-message {
      color: #f44336;
      margin-bottom: 16px;
      font-size: 14px;
    }

    mat-card-actions {
      display: flex;
      justify-content: center;
      gap: 8px;
      padding: 16px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    public themeService: ThemeService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Login failed. Please try again.');
      }
    });
  }
}
