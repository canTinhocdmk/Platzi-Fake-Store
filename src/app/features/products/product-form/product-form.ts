import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { DEFAULT_PRODUCT_IMAGE } from '../../../core/api/api.config';
import { FakeStoreApiService } from '../../../core/api/fake-store-api';
import { PendingChangesComponent } from '../../../core/guards/pending-changes.guard';
import { Category } from '../../../core/models/category.model';
import { ProductDraft } from '../../../core/models/product.model';

type ProductControlName = 'title' | 'price' | 'description' | 'categoryId' | 'image';

@Component({
  selector: 'app-product-form',
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './product-form.html',
  styleUrl: './product-form.css',
})
export class ProductForm implements PendingChangesComponent {
  private readonly api = inject(FakeStoreApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly productId = Number(this.route.snapshot.paramMap.get('id')) || null;

  readonly fallbackImage = DEFAULT_PRODUCT_IMAGE;
  readonly categories = signal<Category[]>([]);
  readonly loading = signal(Boolean(this.productId));
  readonly error = signal('');
  readonly message = signal('');
  readonly saved = signal(false);
  readonly isEdit = signal(Boolean(this.productId));
  readonly title = computed(() => (this.isEdit() ? 'Editar produto' : 'Novo produto'));
  readonly actionLabel = computed(() => (this.isEdit() ? 'Salvar' : 'Criar'));
  readonly lastPayload = signal<ProductDraft | null>(null);

  readonly form = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3)],
    }),
    price: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10)],
    }),
    categoryId: new FormControl<number | null>(null, [Validators.required]),
    image: new FormControl(DEFAULT_PRODUCT_IMAGE, {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^https?:\/\/.+/)],
    }),
  });

  constructor() {
    this.api
      .getCategories()
      .pipe(takeUntilDestroyed())
      .subscribe((categories) => {
        this.categories.set(categories);

        if (!this.isEdit() && categories[0] && !this.form.controls.categoryId.value) {
          this.form.controls.categoryId.setValue(categories[0].id);
          this.form.markAsPristine();
        }
      });

    if (this.productId) {
      this.api
        .getProduct(this.productId)
        .pipe(
          finalize(() => this.loading.set(false)),
          takeUntilDestroyed(),
        )
        .subscribe({
          next: (product) => {
            this.form.patchValue({
              title: product.title,
              price: product.price,
              description: product.description,
              categoryId: product.category.id,
              image: product.images[0] ?? DEFAULT_PRODUCT_IMAGE,
            });
            this.form.markAsPristine();
          },
          error: () => {
            this.error.set('Nao foi possivel carregar o produto selecionado.');
          },
        });
    }
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload: ProductDraft = {
      title: value.title,
      price: Number(value.price),
      description: value.description,
      categoryId: Number(value.categoryId),
      images: [value.image],
    };

    const action = this.isEdit() && this.productId
      ? this.api.updateProduct(this.productId, payload)
      : this.api.createProduct(payload);

    action.subscribe(() => {
      this.lastPayload.set(payload);
      this.saved.set(true);
      this.form.markAsPristine();
      this.message.set(
        this.isEdit()
          ? 'Produto atualizado com sucesso. A listagem foi atualizada.'
          : 'Produto criado com sucesso. O produto aparece na listagem.',
      );

      window.setTimeout(() => {
        void this.router.navigateByUrl('/products');
      }, 700);
    });
  }

  hasUnsavedChanges() {
    return this.form.dirty && !this.saved();
  }

  fieldInvalid(controlName: ProductControlName) {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  imageFallback(event: Event) {
    (event.target as HTMLImageElement).src = this.api.fallbackProductImage(this.productId ?? 0);
  }
}
