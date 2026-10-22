# Marcas Tu?

Uma plataforma de descoberta de restaurantes e reservas, com surpresa opcional. Nova implementação de raiz, em português de Portugal, com HTML, CSS e JavaScript e Vite.

## Desenvolvimento

Requer Node.js 22.12 ou superior (ambiente validado com Node.js 24) e npm.

```sh
npm ci
npm run dev
```

O servidor de desenvolvimento usa a porta 3000. Os ficheiros de origem estão em `src/`; as fotografias e o favicon estão em `public/`.

## Verificação

```sh
npm test
npm run build
npm run test:e2e
```

Os testes de lógica usam o runner nativo do Node. Os testes de navegador usam Playwright em computador e telemóvel e iniciam o servidor automaticamente se necessário. No ambiente na nuvem usam o Chromium já instalado. Noutros computadores, instalar primeiro o browser com `npx playwright install chromium`; a variável opcional `CHROMIUM_PATH` permite indicar outro executável.

```sh
npm run preview
```

Este último comando serve a compilação de produção depois de `npm run build`.

## Funcionalidades

- Descoberta de oito restaurantes fictícios em Lisboa, Porto e Cascais.
- Pesquisa por cidade, cozinha, orçamento, nome ou bairro.
- Escolha surpresa dentro da cidade e do orçamento selecionados.
- Favoritos, perfil local, criação e cancelamento de reservas de demonstração.
- Pedido de adesão de restaurantes em modo de demonstração.
- Layout adaptado ao telemóvel, navegação por teclado e formulários com validação.

## Limites desta versão

Esta é uma demonstração funcional no browser. Restaurantes, moradas, horários e avaliações são fictícios. Não verifica disponibilidade real, não envia reservas nem emails e não tem pagamentos ou autenticação. Um perfil local não é uma conta segura.

Perfil, favoritos, reservas e pedidos de adesão ficam no armazenamento local do browser. Não são sincronizados entre dispositivos e podem ser consultados por quem usar o mesmo browser. Usa dados fictícios. As reservas e o perfil têm fallback em memória quando o armazenamento persistente está indisponível.

As fotografias são imagens originais geradas para esta demonstração. Os dois cenários são reutilizados para ilustrar os restaurantes; não representam estabelecimentos reais. O site não precisa de recursos externos, credenciais nem APIs para funcionar.

Para receber reservas reais, a próxima fase precisa de um backend, base de dados, autenticação, disponibilidade dos restaurantes e envio de confirmações.
