import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, of, switchMap, tap } from 'rxjs';

import { DEFAULT_USER_AVATAR, FAKE_STORE_API_URL } from '../api/api.config';
import { AuthTokens, LoginCredentials, UserProfile } from '../models/auth.models';

const ACCESS_TOKEN_KEY = 'platzi-fake-store.access-token';
const REFRESH_TOKEN_KEY = 'platzi-fake-store.refresh-token';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly accessToken = signal<string | null>(localStorage.getItem(ACCESS_TOKEN_KEY));
  readonly refreshToken = signal<string | null>(localStorage.getItem(REFRESH_TOKEN_KEY));
  readonly profile = signal<UserProfile | null>(null);
  readonly isAuthenticated = computed(() => Boolean(this.accessToken()));

  login(credentials: LoginCredentials) {
    return this.http.post<AuthTokens>(`${FAKE_STORE_API_URL}/auth/login`, credentials).pipe(
      tap((tokens) => this.saveTokens(tokens)),
      switchMap(() =>
        this.loadProfile().pipe(
          catchError(() => {
            this.profile.set(null);
            return of(null);
          }),
        ),
      ),
    );
  }

  loadProfile() {
    return this.http.get<UserProfile>(`${FAKE_STORE_API_URL}/auth/profile`).pipe(
      tap((profile) => {
        this.profile.set({
          ...profile,
          avatar: this.cleanAvatar(profile.avatar),
        });
      }),
    );
  }

  refreshSession(): Observable<AuthTokens | null> {
    const refreshToken = this.refreshToken();
    if (!refreshToken) {
      return of(null);
    }

    return this.http
      .post<AuthTokens>(`${FAKE_STORE_API_URL}/auth/refresh-token`, {
        refreshToken,
      })
      .pipe(tap((tokens) => this.saveTokens(tokens)));
  }

  logout(redirect = true) {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    this.accessToken.set(null);
    this.refreshToken.set(null);
    this.profile.set(null);

    if (redirect) {
      void this.router.navigateByUrl('/login');
    }
  }

  private saveTokens(tokens: AuthTokens) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
    this.accessToken.set(tokens.access_token);
    this.refreshToken.set(tokens.refresh_token);
  }

  private cleanAvatar(value: string | undefined) {
    const avatar = value?.replaceAll('"', '').trim();
    return avatar?.startsWith('http') ? avatar : DEFAULT_USER_AVATAR;
  }
}
