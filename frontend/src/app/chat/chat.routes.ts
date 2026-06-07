import { Routes } from '@angular/router';

export const CHAT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./chat.component').then(m => m.ChatComponent)
  },
  {
    path: ':sessionId',
    loadComponent: () => import('./chat.component').then(m => m.ChatComponent)
  }
];