import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { StorageService } from './storage.service';
import { API_ROUTES, PUBLIC_SIGNUP_ROLES } from '../constants/app.constants';
import { extractApiMessage } from '../utils/utils';
import { catchError, map, tap } from 'rxjs/operators';
import { firstValueFrom, throwError } from 'rxjs';

function sanitizePublicRole(role: string): string {
  return PUBLIC_SIGNUP_ROLES.includes(role) ? role : 'STAFF';
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private storageService = inject(StorageService);

  token = signal<string>(this.storageService.getStoredToken());
  user = signal<any>(null);
  booting = signal<boolean>(true);

  get isAuthenticated(): boolean {
    return Boolean(this.token());
  }

  async bootstrap(): Promise<void> {
    const currentToken = this.token();
    if (!currentToken) {
      this.booting.set(false);
      return;
    }

    try {
      await this.fetchProfile(currentToken);
    } catch {
      this.clearSession();
    } finally {
      this.booting.set(false);
    }
  }

  async fetchProfile(activeToken: string = this.token()): Promise<any> {
    try {
      const profile = await firstValueFrom(
        this.http.get(API_ROUTES.auth.profile)
      );
      this.user.set(profile);
      return profile;
    } catch (error) {
      throw new Error(extractApiMessage(error));
    }
  }

  clearSession(): void {
    this.storageService.clearStoredToken();
    this.token.set('');
    this.user.set(null);
  }

  async login(credentials: any): Promise<any> {
    try {
      const response: any = await firstValueFrom(
        this.http.post(API_ROUTES.auth.login, credentials)
      );
      const nextToken = response.token || response.Token;

      this.storageService.setStoredToken(nextToken);
      this.token.set(nextToken);
      // clearPersistentStore equivalent - we might need to clear local storage items related to persistent state if there are any, but keeping it simple.

      return await this.fetchProfile(nextToken);
    } catch (error) {
      throw new Error(extractApiMessage(error));
    }
  }

  async register(payload: any): Promise<any> {
    try {
      const request = {
        ...payload,
        role: sanitizePublicRole(payload.role),
      };
      return await firstValueFrom(
        this.http.post(API_ROUTES.auth.register, request)
      );
    } catch (error) {
      throw new Error(extractApiMessage(error));
    }
  }

  async createUser(payload: any): Promise<any> {
    try {
      return await firstValueFrom(
        this.http.post(API_ROUTES.auth.register, payload)
      );
    } catch (error) {
      throw new Error(extractApiMessage(error));
    }
  }

  async updateProfile(payload: any): Promise<any> {
    try {
      await firstValueFrom(
        this.http.put(API_ROUTES.auth.profile, payload)
      );
      return await this.fetchProfile();
    } catch (error) {
      throw new Error(extractApiMessage(error));
    }
  }

  async changePassword(payload: any): Promise<any> {
    try {
      await firstValueFrom(
        this.http.put(API_ROUTES.auth.password, payload)
      );
    } catch (error) {
      throw new Error(extractApiMessage(error));
    }
  }

  async refreshSession(): Promise<any> {
    try {
      const currentToken = this.token();
      if (!currentToken) {
        throw new Error('No active session to refresh.');
      }

      const response: any = await firstValueFrom(
        this.http.post(API_ROUTES.auth.refresh, JSON.stringify(currentToken), {
          headers: { 'Content-Type': 'application/json' }
        })
      );
      const nextToken = response.token || response.Token;

      this.storageService.setStoredToken(nextToken);
      this.token.set(nextToken);

      return await this.fetchProfile(nextToken);
    } catch (error) {
      throw new Error(extractApiMessage(error));
    }
  }

  async logout(): Promise<void> {
    try {
      const currentToken = this.token();
      if (currentToken) {
        await firstValueFrom(
          this.http.post(API_ROUTES.auth.logout, JSON.stringify(currentToken), {
            headers: { 'Content-Type': 'application/json' }
          }).pipe(catchError(() => [])) // ignore errors on logout
        );
      }
    } finally {
      this.clearSession();
    }
  }
}
