import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, debounceTime, finalize, of, startWith, switchMap } from 'rxjs';

import { DEFAULT_PRODUCT_IMAGE } from '../../../core/api/api.config';
import { FakeStoreApiService } from '../../../core/api/fake-store-api';
import { Category } from '../../../core/models/category.model';
import { Product } from '../../../core/models/product.model';

@Component({
  selector: 'app-product-list',
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductList {
  private readonly api = inject(FakeStoreApiService);

  readonly categories = signal<Category[]>([]);
  readonly products = signal<Product[]>([]);
  readonly deletedIds = signal<ReadonlySet<number>>(new Set<number>());
  readonly loading = signal(true);
  readonly error = signal('');
  readonly message = signal('');

  readonly filters = new FormGroup({
    title: new FormControl('', { nonNullable: true }),
    categoryId: new FormControl<number | null>(null),
    priceMin: new FormControl<number | null>(null),
    priceMax: new FormControl<number | null>(null),
  });

  readonly visibleProducts = computed(() => {
    const deletedIds = this.deletedIds();
    return this.products().filter((product) => !deletedIds.has(product.id));
  });

  constructor() {
    this.api
      .getCategories()
      .pipe(
        catchError(() => {
          this.error.set('Nao foi possivel carregar as categorias.');
          return of([]);
        }),
        takeUntilDestroyed(),
      )
      .subscribe((categories) => this.categories.set(categories));

    this.filters.valueChanges
      .pipe(
        startWith(this.filters.getRawValue()),
        debounceTime(350),
        switchMap(() => {
          this.loading.set(true);
          this.error.set('');
          this.message.set('');

          return this.api.getProducts(this.filters.getRawValue()).pipe(
            catchError(() => {
              this.error.set('Nao foi possivel carregar os produtos.');
              return of([]);
            }),
            finalize(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((products) => {
        this.products.set(products);
      });
  }

  resetFilters() {
    this.filters.reset({
      title: '',
      categoryId: null,
      priceMin: null,
      priceMax: null,
    });
  }

  deleteProduct(product: Product) {
    const confirmed = window.confirm(`Excluir o produto "${product.title}"?`);
    if (!confirmed) {
      return;
    }

    this.api.deleteProduct(product.id).subscribe(() => {
      this.deletedIds.update((ids) => new Set(ids).add(product.id));
      this.message.set(`Produto #${product.id} excluido com sucesso.`);
    });
  }

  cover(product: Product) {
    return product.images[0] ?? DEFAULT_PRODUCT_IMAGE;
  }

  imageFallback(event: Event, productId: number) {
    (event.target as HTMLImageElement).src = this.api.fallbackProductImage(productId);
  }
}
