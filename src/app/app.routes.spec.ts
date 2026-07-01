import { routes } from './app.routes';

describe('protected edit routes', () => {
  it('should protect product and category form routes with canDeactivate', () => {
    const shellRoute = routes.find((route) => route.path === '');
    const children = shellRoute?.children ?? [];
    const formPaths = ['products/new', 'products/:id/edit', 'categories/new', 'categories/:id/edit'];

    const protectedPaths = children
      .filter((route) => formPaths.includes(route.path ?? ''))
      .filter((route) => Boolean(route.canDeactivate?.length))
      .map((route) => route.path);

    expect(protectedPaths).toEqual(formPaths);
  });
});
