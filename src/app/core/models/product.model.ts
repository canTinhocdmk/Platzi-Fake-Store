import { Category } from './category.model';

export interface Product {
  id: number;
  title: string;
  slug?: string;
  price: number;
  description: string;
  category: Category;
  images: string[];
  creationAt?: string;
  updatedAt?: string;
}

export interface ProductFilters {
  title: string;
  categoryId: number | null;
  priceMin: number | null;
  priceMax: number | null;
}

export interface ProductDraft {
  title: string;
  price: number;
  description: string;
  categoryId: number;
  images: string[];
}
