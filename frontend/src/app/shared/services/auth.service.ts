import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { tap, catchError, of, timeout } from 'rxjs';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: User;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly userSignal = signal<User | null>(null);
  private readonly tokenKey = 'accessToken';
  private readonly refreshTokenKey = 'refreshToken';
  private readonly expiresAtKey = 'expiresAt';
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.userSignal());

  constructor(private http: HttpClient, private router: Router) {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    const token = this.getToken();
    const userJson = localStorage.getItem('user');
    if (token && userJson) {
      try {
        this.userSignal.set(JSON.parse(userJson));
        this.scheduleTokenRefresh();
      } catch {
        this.clearAuth();
      }
    }
  }

  register(email: string, password: string, firstName: string, lastName: string) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, {
      email, password, firstName, lastName
    }).pipe(
      tap(response => this.handleAuthResponse(response)),
      catchError((error: HttpErrorResponse) => {
        console.error('Registration failed', error);
        throw error;
      })
    );
  }

  login(email: string, password: string) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, {
      email, password
    }).pipe(
      tap(response => this.handleAuthResponse(response)),
      catchError((error: HttpErrorResponse) => {
        console.error('Login failed', error);
        throw error;
      })
    );
  }

  refreshToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return of(null);
    }

    return this.http.post<RefreshTokenResponse>(`${environment.apiUrl}/auth/refresh`, {
      refreshToken
    }).pipe(
      timeout(10000),
      tap(response => {
        localStorage.setItem(this.tokenKey, response.accessToken);
        localStorage.setItem(this.refreshTokenKey, response.refreshToken);
        localStorage.setItem(this.expiresAtKey, response.expiresAt);
        this.scheduleTokenRefresh();
      }),
      catchError(() => {
        this.clearAuth();
        return of(null);
      })
    );
  }

  logout(): void {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      this.http.post(`${environment.apiUrl}/auth/revoke`, { refreshToken }).subscribe();
    }
    this.clearAuth();
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  private handleAuthResponse(response: AuthResponse): void {
    localStorage.setItem(this.tokenKey, response.accessToken);
    localStorage.setItem(this.refreshTokenKey, response.refreshToken);
    localStorage.setItem(this.expiresAtKey, response.expiresAt);
    localStorage.setItem('user', JSON.stringify(response.user));
    this.userSignal.set(response.user);
    this.scheduleTokenRefresh();
  }

  private scheduleTokenRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    const expiresAt = localStorage.getItem(this.expiresAtKey);
    if (!expiresAt) return;

    const expiryTime = new Date(expiresAt).getTime();
    const now = Date.now();
    const ttl = expiryTime - now;

    if (ttl <= 0) {
      this.refreshToken().subscribe();
      return;
    }

    const delay = Math.min(ttl * 0.8, ttl - 60_000);
    if (delay > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshToken().subscribe();
      }, delay);
    }
  }

  private clearAuth(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.expiresAtKey);
    localStorage.removeItem('user');
    this.userSignal.set(null);
  }
}
