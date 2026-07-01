import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { catchError, of } from 'rxjs';

import { AuthService } from '../../core/auth/auth';
import { DEFAULT_USER_AVATAR } from '../../core/api/api.config';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {
  readonly auth = inject(AuthService);
  readonly navItems = [
    { label: 'Produtos', path: '/products' },
    { label: 'Categorias', path: '/categories' },
  ];

  constructor() {
    if (this.auth.isAuthenticated() && !this.auth.profile()) {
      this.auth
        .loadProfile()
        .pipe(
          catchError(() => of(null)),
          takeUntilDestroyed(),
        )
        .subscribe();
    }
  }

  initials() {
    return this.auth.profile()?.name.slice(0, 2).toUpperCase() ?? 'FS';
  }

  logout() {
    this.auth.logout();
  }

  profileImageFallback(event: Event) {
    (event.target as HTMLImageElement).src = DEFAULT_USER_AVATAR;
  }
}
