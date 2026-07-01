import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { pendingChangesGuard } from './core/guards/pending-changes.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'products',
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/products/product-list/product-list').then((m) => m.ProductList),
      },
      {
        path: 'products/new',
        canDeactivate: [pendingChangesGuard],
        loadComponent: () =>
          import('./features/products/product-form/product-form').then((m) => m.ProductForm),
      },
      {
        path: 'products/:id/edit',
        canDeactivate: [pendingChangesGuard],
        loadComponent: () =>
          import('./features/products/product-form/product-form').then((m) => m.ProductForm),
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./features/categories/category-list/category-list').then((m) => m.CategoryList),
      },
      {
        path: 'categories/new',
        canDeactivate: [pendingChangesGuard],
        loadComponent: () =>
          import('./features/categories/category-form/category-form').then((m) => m.CategoryForm),
      },
      {
        path: 'categories/:id/edit',
        canDeactivate: [pendingChangesGuard],
        loadComponent: () =>
          import('./features/categories/category-form/category-form').then((m) => m.CategoryForm),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
