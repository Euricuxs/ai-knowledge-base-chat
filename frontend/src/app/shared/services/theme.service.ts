import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly themeSignal = signal<'light' | 'dark'>('light');

  readonly theme = this.themeSignal.asReadonly();
  readonly isDarkMode = computed(() => this.themeSignal() === 'dark');

  initializeTheme(): void {
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored ?? (prefersDark ? 'dark' : 'light');
    this.setTheme(theme);
  }

  toggleTheme(): void {
    const newTheme = this.themeSignal() === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  setTheme(theme: 'light' | 'dark'): void {
    this.themeSignal.set(theme);
    localStorage.setItem('theme', theme);
    document.body.classList.toggle('dark-theme', theme === 'dark');
  }
}