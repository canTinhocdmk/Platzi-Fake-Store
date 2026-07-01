# Fake Store Admin

Sistema Angular para gestao visual dos dados da Platzi Fake Store API.

## Tecnologias

- Angular 21
- Angular CLI
- Standalone components
- Reactive Forms
- Signals e computed state
- HttpClient com interceptor JWT
- Route guards com `canActivate` e `canDeactivate`
- CSS responsivo sem framework externo

## Como rodar

```bash
npm install
npm start
```

Acesse:

```text
http://127.0.0.1:4200
```

## Login de teste

```text
Email: john@mail.com
Senha: changeme
```

## Funcionalidades

- Login com JWT pela rota `/auth/login`.
- Interceptor adicionando `Authorization: Bearer <token>`.
- Guard bloqueando rotas internas sem autenticacao.
- Listagem de produtos com filtros por titulo, categoria e faixa de preco.
- Listagem de categorias com filtro por nome ou slug.
- Telas de inclusao e edicao para produtos e categorias.
- Fluxo de exclusao, inclusao e edicao com atualizacao da listagem local.
- Guard `canDeactivate` para formularios com alteracoes nao salvas.

## Validacao feita

```bash
npm run build
npm test -- --watch=false
```
