import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { DEFAULT_CATEGORY_IMAGE } from '../../../core/api/api.config';
import { FakeStoreApiService } from '../../../core/api/fake-store-api';
import { PendingChangesComponent } from '../../../core/guards/pending-changes.guard';
import { CategoryDraft } from '../../../core/models/category.model';

type CategoryControlName = 'name' | 'image';

@Component({
  selector: 'app-category-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './category-form.html',
  styleUrl: './category-form.css',
})
export class CategoryForm implements PendingChangesComponent {
  private readonly api = inject(FakeStoreApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly categoryId = Number(this.route.snapshot.paramMap.get('id')) || null;

  readonly fallbackImage = DEFAULT_CATEGORY_IMAGE;
  readonly loading = signal(Boolean(this.categoryId));
  readonly error = signal('');
  readonly message = signal('');
  readonly saved = signal(false);
  readonly isEdit = signal(Boolean(this.categoryId));
  readonly title = computed(() => (this.isEdit() ? 'Editar categoria' : 'Nova categoria'));
  readonly actionLabel = computed(() => (this.isEdit() ? 'Salvar' : 'Criar'));
  readonly lastPayload = signal<CategoryDraft | null>(null);

  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3)],
    }),
    image: new FormControl(DEFAULT_CATEGORY_IMAGE, {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^https?:\/\/.+/)],
    }),
  });

  constructor() {
    if (this.categoryId) {
      this.api
        .getCategory(this.categoryId)
        .pipe(
          finalize(() => this.loading.set(false)),
          takeUntilDestroyed(),
        )
        .subscribe({
          next: (category) => {
            this.form.patchValue({
              name: category.name,
              image: category.image,
            });
            this.form.markAsPristine();
          },
          error: () => {
            this.error.set('Nao foi possivel carregar a categoria selecionada.');
          },
        });
    }
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue();
    const action = this.isEdit() && this.categoryId
      ? this.api.updateCategory(this.categoryId, payload)
      : this.api.createCategory(payload);

    action.subscribe(() => {
      this.lastPayload.set(payload);
      this.saved.set(true);
      this.form.markAsPristine();
      this.message.set(
        this.isEdit()
          ? 'Categoria atualizada com sucesso. A listagem foi atualizada.'
          : 'Categoria criada com sucesso. A categoria aparece na listagem.',
      );

      window.setTimeout(() => {
        void this.router.navigateByUrl('/categories');
      }, 700);
    });
  }

  hasUnsavedChanges() {
    return this.form.dirty && !this.saved();
  }

  fieldInvalid(controlName: CategoryControlName) {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  imageFallback(event: Event) {
    (event.target as HTMLImageElement).src = this.api.fallbackCategoryImage(this.categoryId ?? 0);
  }
}
