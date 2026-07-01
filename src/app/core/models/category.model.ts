export interface Category {
  id: number;
  name: string;
  slug?: string;
  image: string;
  creationAt?: string;
  updatedAt?: string;
}

export interface CategoryDraft {
  name: string;
  image: string;
}
