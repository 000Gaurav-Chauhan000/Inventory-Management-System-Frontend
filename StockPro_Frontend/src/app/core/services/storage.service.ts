import { Injectable } from '@angular/core';
import { TOKEN_KEY } from '../constants/app.constants';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  getStoredToken(): string {
    return localStorage.getItem(TOKEN_KEY) || '';
  }

  setStoredToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  clearStoredToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  }
}
