import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
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
  selector: 'app-register',
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
          <mat-card-title>Create Account</mat-card-title>
          <mat-card-subtitle>Join us today</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
            <div class="name-row">
              <mat-form-field appearance="outline">
                <mat-label>First Name</mat-label>
                <input matInput formControlName="firstName" />
                @if (registerForm.get('firstName')?.hasError('required')) {
                  <mat-error>First name is required</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Last Name</mat-label>
                <input matInput formControlName="lastName" />
                @if (registerForm.get('lastName')?.hasError('required')) {
                  <mat-error>Last name is required</mat-error>
                }
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" />
              @if (registerForm.get('email')?.hasError('required')) {
                <mat-error>Email is required</mat-error>
              }
              @if (registerForm.get('email')?.hasError('email')) {
                <mat-error>Please enter a valid email</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput type="password" formControlName="password" />
              @if (registerForm.get('password')?.hasError('required')) {
                <mat-error>Password is required</mat-error>
              }
              @if (registerForm.get('password')?.hasError('minlength')) {
                <mat-error>Password must be at least 6 characters</mat-error>
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
                Create Account
              }
            </button>
          </form>
        </mat-card-content>

        <mat-card-actions>
          <span>Already have an account?</span>
          <a mat-button color="primary" routerLink="/auth/login">Sign In</a>
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

    .name-row {
      display: flex;
      gap: 16px;
      margin-bottom: 0;

      mat-form-field {
        flex: 1;
      }
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

      .name-row {
        flex-direction: column;
        gap: 0;
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
export class RegisterComponent {
  registerForm: FormGroup;
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    public themeService: ThemeService
  ) {
    this.registerForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.registerForm.invalid) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    const { email, password, firstName, lastName } = this.registerForm.value;

    this.authService.register(email, password, firstName, lastName).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Registration failed. Please try again.');
      }
    });
  }
}
