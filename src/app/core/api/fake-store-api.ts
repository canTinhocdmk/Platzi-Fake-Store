import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, of } from 'rxjs';

import {
  CATEGORY_FALLBACK_IMAGES,
  DEFAULT_CATEGORY_IMAGE,
  DEFAULT_PRODUCT_IMAGE,
  FAKE_STORE_API_URL,
  PRODUCT_FALLBACK_IMAGES,
} from './api.config';
import { Category, CategoryDraft } from '../models/category.model';
import { Product, ProductDraft, ProductFilters } from '../models/product.model';

const LOCAL_PRODUCTS_KEY = 'platzi-fake-store.local-products';
const LOCAL_CATEGORIES_KEY = 'platzi-fake-store.local-categories';
const DELETED_PRODUCTS_KEY = 'platzi-fake-store.deleted-products';
const DELETED_CATEGORIES_KEY = 'platzi-fake-store.deleted-categories';
const LOCAL_ID_START = 100000;

@Injectable({
  providedIn: 'root',
})
export class FakeStoreApiService {
  private readonly http = inject(HttpClient);

  getProducts(filters: Partial<ProductFilters> = {}) {
    let params = new HttpParams().set('limit', 100).set('offset', 0);

    const title = filters.title?.trim();
    if (title) {
      params = params.set('title', title);
    }

    if (filters.categoryId) {
      params = params.set('categoryId', filters.categoryId);
    }

    if (filters.priceMin !== null && filters.priceMin !== undefined) {
      params = params.set('price_min', filters.priceMin);
    }

    if (filters.priceMax !== null && filters.priceMax !== undefined) {
      params = params.set('price_max', filters.priceMax);
    }

    return this.http
      .get<Product[]>(`${FAKE_STORE_API_URL}/products`, { params })
      .pipe(
        map((products) => {
          const apiProducts = products
            .map((product) => this.normalizeProduct(product))
            .filter((product) => this.hasGoodProductData(product));

          return this.applyProductFilters(this.mergeLocalProducts(apiProducts), filters);
        }),
      );
  }

  getProduct(id: number) {
    const localProduct = this.readProducts().find((product) => product.id === id);
    if (localProduct) {
      return of(localProduct);
    }

    return this.http
      .get<Product>(`${FAKE_STORE_API_URL}/products/${id}`)
      .pipe(map((product) => this.findLocalProductOverride(this.normalizeProduct(product))));
  }

  getCategories() {
    return this.http
      .get<Category[]>(`${FAKE_STORE_API_URL}/categories`)
      .pipe(
        map((categories) =>
          this.mergeLocalCategories(
            categories.map((category) => this.normalizeCategory(category)),
          ),
        ),
      );
  }

  getCategory(id: number) {
    const localCategory = this.readCategories().find((category) => category.id === id);
    if (localCategory) {
      return of(localCategory);
    }

    return this.http
      .get<Category>(`${FAKE_STORE_API_URL}/categories/${id}`)
      .pipe(map((category) => this.findLocalCategoryOverride(this.normalizeCategory(category))));
  }

  createProduct(draft: ProductDraft) {
    const category = this.findCategoryForDraft(draft.categoryId);
    const product: Product = {
      id: this.nextId(this.readProducts()),
      title: draft.title,
      price: draft.price,
      description: draft.description,
      category,
      images: this.cleanImages(draft.images, this.nextId(this.readProducts())),
    };

    this.saveProducts([product, ...this.readProducts()]);
    return of(product);
  }

  updateProduct(id: number, draft: ProductDraft) {
    const category = this.findCategoryForDraft(draft.categoryId);
    const product: Product = {
      id,
      title: draft.title,
      price: draft.price,
      description: draft.description,
      category,
      images: this.cleanImages(draft.images, id),
    };

    const products = this.readProducts().filter((storedProduct) => storedProduct.id !== id);
    this.saveProducts([product, ...products]);
    return of(product);
  }

  deleteProduct(id: number) {
    this.saveDeletedIds(DELETED_PRODUCTS_KEY, [...this.readDeletedIds(DELETED_PRODUCTS_KEY), id]);
    return of(true);
  }

  createCategory(draft: CategoryDraft) {
    const category: Category = {
      id: this.nextId(this.readCategories()),
      name: draft.name,
      slug: this.slugify(draft.name),
      image: this.cleanImageUrl(draft.image, DEFAULT_CATEGORY_IMAGE, this.readCategories().length),
    };

    this.saveCategories([category, ...this.readCategories()]);
    return of(category);
  }

  updateCategory(id: number, draft: CategoryDraft) {
    const category: Category = {
      id,
      name: draft.name,
      slug: this.slugify(draft.name),
      image: this.cleanImageUrl(draft.image, DEFAULT_CATEGORY_IMAGE, id),
    };

    const categories = this.readCategories().filter((storedCategory) => storedCategory.id !== id);
    this.saveCategories([category, ...categories]);
    return of(category);
  }

  deleteCategory(id: number) {
    this.saveDeletedIds(DELETED_CATEGORIES_KEY, [...this.readDeletedIds(DELETED_CATEGORIES_KEY), id]);
    return of(true);
  }

  private normalizeProduct(product: Product): Product {
    const images = this.cleanImages(product.images, product.id);

    return {
      ...product,
      images,
      category: this.normalizeCategory(product.category),
    };
  }

  private normalizeCategory(category: Category): Category {
    return {
      ...category,
      image: this.cleanImageUrl(category.image, DEFAULT_CATEGORY_IMAGE, category.id),
    };
  }

  fallbackProductImage(seed: number) {
    return PRODUCT_FALLBACK_IMAGES[Math.abs(seed) % PRODUCT_FALLBACK_IMAGES.length];
  }

  fallbackCategoryImage(seed: number) {
    return CATEGORY_FALLBACK_IMAGES[Math.abs(seed) % CATEGORY_FALLBACK_IMAGES.length];
  }

  private cleanImages(values: string[] = [], seed: number): string[] {
    const images = values
      .map((image) => this.cleanImageUrl(image, DEFAULT_PRODUCT_IMAGE, seed))
      .filter((image) => this.isReliableImageUrl(image));

    return images.length ? images : [this.fallbackProductImage(seed)];
  }

  private cleanImageUrl(value: string | undefined, fallback: string, seed: number): string {
    const clean = value?.replaceAll('"', '').replaceAll('[', '').replaceAll(']', '').trim();
    if (!clean?.startsWith('http') || !this.isReliableImageUrl(clean)) {
      return fallback === DEFAULT_CATEGORY_IMAGE
        ? this.fallbackCategoryImage(seed)
        : this.fallbackProductImage(seed);
    }

    return clean;
  }

  private isReliableImageUrl(value: string) {
    const url = value.toLowerCase();
    const blockedSources = [
      'placehold.co',
      'placeholder',
      'placeimg.com',
      'loremflickr',
      'picsum.photos',
      'example.com',
      'localhost',
      'undefined',
      'null',
    ];

    return (
      url.startsWith('http') &&
      !blockedSources.some((blockedSource) => url.includes(blockedSource)) &&
      /\.(jpg|jpeg|png|webp)(\?|$)/.test(url)
    );
  }

  private hasGoodProductData(product: Product) {
    return (
      product.title.trim().length >= 3 &&
      product.description.trim().length >= 10 &&
      product.price > 0 &&
      product.images.some((image) => this.isReliableImageUrl(image))
    );
  }

  private mergeLocalProducts(apiProducts: Product[]) {
    const deletedIds = this.readDeletedIds(DELETED_PRODUCTS_KEY);
    const localProducts = this.readProducts();
    const localIds = new Set(localProducts.map((product) => product.id));

    return [
      ...localProducts,
      ...apiProducts.filter((product) => !localIds.has(product.id)),
    ].filter((product) => !deletedIds.includes(product.id));
  }

  private mergeLocalCategories(apiCategories: Category[]) {
    const deletedIds = this.readDeletedIds(DELETED_CATEGORIES_KEY);
    const localCategories = this.readCategories();
    const localIds = new Set(localCategories.map((category) => category.id));

    return [
      ...localCategories,
      ...apiCategories.filter((category) => !localIds.has(category.id)),
    ].filter((category) => !deletedIds.includes(category.id));
  }

  private findLocalProductOverride(product: Product) {
    return this.readProducts().find((storedProduct) => storedProduct.id === product.id) ?? product;
  }

  private findLocalCategoryOverride(category: Category) {
    return this.readCategories().find((storedCategory) => storedCategory.id === category.id) ?? category;
  }

  private applyProductFilters(products: Product[], filters: Partial<ProductFilters>) {
    const title = filters.title?.trim().toLowerCase();

    return products.filter((product) => {
      const matchesTitle = !title || product.title.toLowerCase().includes(title);
      const matchesCategory = !filters.categoryId || product.category.id === filters.categoryId;
      const matchesMin =
        filters.priceMin === null ||
        filters.priceMin === undefined ||
        product.price >= filters.priceMin;
      const matchesMax =
        filters.priceMax === null ||
        filters.priceMax === undefined ||
        product.price <= filters.priceMax;

      return matchesTitle && matchesCategory && matchesMin && matchesMax;
    });
  }

  private findCategoryForDraft(categoryId: number) {
    return (
      this.readCategories().find((category) => category.id === categoryId) ?? {
        id: categoryId,
        name: 'Categoria selecionada',
        slug: 'categoria-selecionada',
        image: this.fallbackCategoryImage(categoryId),
      }
    );
  }

  private readProducts() {
    return this.readJson<Product[]>(LOCAL_PRODUCTS_KEY, []);
  }

  private saveProducts(products: Product[]) {
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(products));
  }

  private readCategories() {
    return this.readJson<Category[]>(LOCAL_CATEGORIES_KEY, []);
  }

  private saveCategories(categories: Category[]) {
    localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(categories));
  }

  private readDeletedIds(key: string) {
    return this.readJson<number[]>(key, []);
  }

  private saveDeletedIds(key: string, ids: number[]) {
    localStorage.setItem(key, JSON.stringify([...new Set(ids)]));
  }

  private readJson<T>(key: string, fallback: T): T {
    try {
      return JSON.parse(localStorage.getItem(key) ?? '') as T;
    } catch {
      return fallback;
    }
  }

  private nextId(records: Array<{ id: number }>) {
    const highestId = records.reduce((highest, record) => Math.max(highest, record.id), LOCAL_ID_START);
    return highestId + 1;
  }

  private slugify(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
