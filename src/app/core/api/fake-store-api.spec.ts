import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { FakeStoreApiService } from './fake-store-api';

describe('FakeStoreApiService local records', () => {
  let service: FakeStoreApiService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });

    service = TestBed.inject(FakeStoreApiService);
  });

  it('should create, update and delete a product locally', async () => {
    const created = await firstValueFrom(
      service.createProduct({
        title: 'Produto Conferido Codex',
        price: 199,
        description: 'Produto criado para validar o fluxo de inclusao.',
        categoryId: 1,
        images: ['https://i.imgur.com/ZANVnHE.jpeg'],
      }),
    );

    expect(created.title).toBe('Produto Conferido Codex');

    const updated = await firstValueFrom(
      service.updateProduct(created.id, {
        title: 'Produto Conferido Editado',
        price: 249,
        description: 'Produto atualizado para validar o fluxo de edicao.',
        categoryId: 1,
        images: ['https://i.imgur.com/yVeIeDa.jpeg'],
      }),
    );

    expect(updated.title).toBe('Produto Conferido Editado');
    expect(updated.price).toBe(249);

    const deleted = await firstValueFrom(service.deleteProduct(created.id));
    expect(deleted).toBe(true);
  });

  it('should create, update and delete a category locally', async () => {
    const created = await firstValueFrom(
      service.createCategory({
        name: 'Categoria Conferida',
        image: 'https://i.imgur.com/QkIa5tT.jpeg',
      }),
    );

    expect(created.name).toBe('Categoria Conferida');
    expect(created.slug).toBe('categoria-conferida');

    const updated = await firstValueFrom(
      service.updateCategory(created.id, {
        name: 'Categoria Editada',
        image: 'https://i.imgur.com/1twoaDy.jpeg',
      }),
    );

    expect(updated.name).toBe('Categoria Editada');
    expect(updated.slug).toBe('categoria-editada');

    const deleted = await firstValueFrom(service.deleteCategory(created.id));
    expect(deleted).toBe(true);
  });
});
