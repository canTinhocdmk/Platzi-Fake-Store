import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, debounceTime, of, startWith } from 'rxjs';

import { FakeStoreApiService } from '../../../core/api/fake-store-api';
import { Category } from '../../../core/models/category.model';

@Component({
  selector: 'app-category-list',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './category-list.html',
  styleUrl: './category-list.css',
})
export class CategoryList {
  private readonly api = inject(FakeStoreApiService);

  readonly search = new FormControl('', { nonNullable: true });
  readonly query = signal('');
  readonly loading = signal(true);
  readonly error = signal('');
  readonly message = signal('');
  readonly categories = signal<Category[]>([]);
  readonly deletedIds = signal<ReadonlySet<number>>(new Set<number>());

  readonly filteredCategories = computed(() => {
    const query = this.query();
    const deletedIds = this.deletedIds();

    return this.categories().filter((category) => {
      const searchable = `${category.name} ${category.slug ?? ''}`.toLowerCase();
      return !deletedIds.has(category.id) && searchable.includes(query);
    });
  });

  constructor() {
    this.search.valueChanges
      .pipe(startWith(this.search.value), debounceTime(180), takeUntilDestroyed())
      .subscribe((value) => this.query.set(value.trim().toLowerCase()));

    this.api
      .getCategories()
      .pipe(
        catchError(() => {
          this.error.set('Nao foi possivel carregar as categorias.');
          return of([]);
        }),
        takeUntilDestroyed(),
      )
      .subscribe((categories) => {
        this.categories.set(categories);
        this.loading.set(false);
      });
  }

  deleteCategory(category: Category) {
    const confirmed = window.confirm(`Excluir a categoria "${category.name}"?`);
    if (!confirmed) {
      return;
    }

    this.api.deleteCategory(category.id).subscribe(() => {
      this.deletedIds.update((ids) => new Set(ids).add(category.id));
      this.message.set(`Categoria #${category.id} excluida com sucesso.`);
    });
  }

  resetSearch() {
    this.search.setValue('');
  }

  imageFallback(event: Event, categoryId: number) {
    (event.target as HTMLImageElement).src = this.api.fallbackCategoryImage(categoryId);
  }
}
