import { test, expect } from '@playwright/test';

async function expectNoHorizontalOverflow(page) {
  const dimensions = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
}

async function fillBooking(page, name = 'Ana Teste', email = 'ana@example.test') {
  await page.locator('#booking-name').fill(name);
  await page.locator('#booking-email').fill(email);
  await page.locator('#booking-form [name="consent"]').check();
  await page.locator('#booking-form button[type="submit"]').click();
}

test('página inicial apresenta fotografias locais e cidades sem erros de execução', async ({ page }) => {
  const runtimeErrors = [];
  const failedResponses = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('A melhor mesa?');
  await expect(page.locator('.restaurant-card')).toHaveCount(4);
  await expect.poll(() => page.locator('.hero-photo').evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true);
  await expect.poll(() => page.locator('.hero-small-photo').evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true);
  await page.getByRole('button', { name: 'Porto', exact: true }).click();
  await expect(page.locator('.restaurant-card')).toHaveCount(2);
  await expect(page.locator('.card-location').first()).toContainText('Porto');
  await expectNoHorizontalOverflow(page);
  expect(runtimeErrors).toEqual([]);
  expect(failedResponses).toEqual([]);
});

test('pesquisa combina filtros, mostra estado vazio e guarda favoritos após recarregar', async ({ page }) => {
  await page.goto('/#explorar');
  await expect(page.locator('.restaurant-card')).toHaveCount(8);
  const favorite = page.locator('.favorite-button[data-id="casa-do-largo"]');
  await favorite.click();
  await expect(favorite).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.locator('.favorite-button[data-id="casa-do-largo"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#filter-city').selectOption('Porto');
  await page.locator('#filter-cuisine').selectOption('Portuguesa');
  await page.locator('#filter-budget').selectOption('35');
  await page.locator('#filter-query').fill('douro');
  await page.locator('#filter-form button[type="submit"]').click();
  await expect(page.locator('.restaurant-card')).toHaveCount(1);
  await expect(page.locator('.card-title')).toHaveText('À Mesa do Douro');
  await page.locator('#filter-query').fill('nenhum-restaurante-assim');
  await page.locator('#filter-form button[type="submit"]').click();
  await expect(page.locator('.empty-title')).toHaveText('Ainda não encontrámos essa mesa.');
  await page.getByRole('button', { name: 'Ver todos os restaurantes', exact: true }).click();
  await expect(page.locator('.restaurant-card')).toHaveCount(8);
  await expect(page.locator('#filter-city')).toHaveValue('Todas');
  await expect(page.locator('.favorite-button[data-id="casa-do-largo"]')).toHaveAttribute('aria-pressed', 'true');
  await expectNoHorizontalOverflow(page);
});

test('surpresa respeita preferências e permite guardar, recuperar e cancelar a reserva', async ({ page }) => {
  await page.goto('/');
  await page.locator('#home-city').fill('Port');
  await page.locator('#home-city-options').getByRole('option', { name: 'Porto', exact: true }).click();
  await page.locator('#home-budget').selectOption('25');
  await page.locator('#home-guests').fill('12');
  await page.locator('#search-form button[type="submit"]').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.reveal-details h3')).toHaveText('Forno da Rua');
  await expect(page.locator('#booking-guests')).toHaveValue('12');
  await fillBooking(page);
  await expect(page.locator('.booking-reference')).toHaveText(/^MT-[A-Z0-9]{6}$/);
  await expect(page.locator('#modal-content')).toContainText('Não foi enviado qualquer email.');
  await page.getByRole('button', { name: 'Ver as minhas reservas' }).click();
  await expect(page).toHaveURL(/#reservas$/);
  await expect(page.locator('.booking-card')).toHaveCount(1);
  await expect(page.locator('.booking-card')).toContainText('Forno da Rua');
  await expect(page.locator('.booking-card')).toContainText('12 pessoas');
  await page.reload();
  await expect(page.locator('.booking-status')).toHaveText('Confirmada · demonstração');
  await expect(page.locator('.booking-card')).toContainText('12 pessoas');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('marcas-tu:bookings:v1')));
  expect(stored[0]).toMatchObject({ restaurantId: 'forno-da-rua', surprise: true, guests: 12, email: 'ana@example.test' });
  await page.getByRole('button', { name: 'Cancelar reserva', exact: true }).click();
  await page.getByRole('button', { name: 'Manter a reserva', exact: true }).click();
  await expect(page.locator('.booking-status')).toContainText('Confirmada');
  await page.getByRole('button', { name: 'Cancelar reserva', exact: true }).click();
  await page.getByRole('button', { name: 'Sim, cancelar reserva', exact: true }).click();
  await expect(page.locator('.booking-status')).toHaveText('Cancelada');
  await page.reload();
  await expect(page.locator('.booking-status')).toHaveText('Cancelada');
  await expectNoHorizontalOverflow(page);
});

test('reserva direta valida os campos e impede reservas duplicadas', async ({ page }) => {
  await page.goto('/#explorar');
  await page.locator('[data-action="book"][data-id="casa-do-largo"]').click();
  await page.locator('#booking-form button[type="submit"]').click();
  await expect(page.locator('#booking-form')).toBeVisible();
  await expect(page.locator('.booking-reference')).toHaveCount(0);
  await page.locator('#booking-name').fill('Maria Teste');
  await page.locator('#booking-email').fill('maria@example.test');
  await page.locator('#booking-form [name="consent"]').check();
  const guests = page.locator('#booking-guests');
  for (const invalid of ['', '0', '-2', '1.5']) {
    await guests.fill(invalid);
    expect(await guests.evaluate((input) => input.validity.valid)).toBe(false);
    await page.locator('#booking-form button[type="submit"]').click();
    await expect(page.locator('#booking-form')).toBeVisible();
    await expect(page.locator('.booking-reference')).toHaveCount(0);
  }
  await guests.fill('25');
  await fillBooking(page, 'Maria Teste', 'maria@example.test');
  await expect(page.locator('.booking-reference')).toBeVisible();
  await expect(page.locator('.form-summary')).toContainText('25 pessoas');
  await page.locator('[data-action="close-modal"]').first().click();
  await page.locator('[data-action="book"][data-id="casa-do-largo"]').click();
  await fillBooking(page, 'Maria Teste', 'maria@example.test');
  await expect(page.getByRole('alert')).toContainText('Já tens uma reserva confirmada');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('marcas-tu:bookings:v1')));
  expect(stored).toHaveLength(1);
  expect(stored[0].surprise).toBe(false);
  expect(stored[0].guests).toBe(25);
});

test('perfil local preenche reservas, persiste e pode ser removido', async ({ page }) => {
  await page.goto('/');
  await page.locator('#profile-trigger').click();
  await page.locator('#profile-name').fill('Rita Teste');
  await page.locator('#profile-email').fill('rita@example.test');
  await page.getByRole('button', { name: 'Guardar perfil', exact: false }).click();
  await expect(page.locator('#profile-trigger')).toHaveText('Olá, Rita');
  await page.reload();
  await expect(page.locator('#profile-trigger')).toHaveText('Olá, Rita');
  await page.locator('[data-action="book"]').first().click();
  await expect(page.locator('#booking-name')).toHaveValue('Rita Teste');
  await expect(page.locator('#booking-email')).toHaveValue('rita@example.test');
  await page.keyboard.press('Escape');
  await page.locator('#profile-trigger').click();
  await page.getByRole('button', { name: 'Remover perfil deste dispositivo', exact: true }).click();
  await expect(page.locator('#profile-trigger')).toHaveText('O meu perfil');
  expect(await page.evaluate(() => localStorage.getItem('marcas-tu:profile:v1'))).toBeNull();
});

test('restaurante pode experimentar adesão sem envio real de dados', async ({ page }) => {
  await page.goto('/#restaurante');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('O teu restaurante.');
  await page.getByRole('button', { name: 'Quero fazer parte' }).click();
  await page.locator('#partner-restaurant').fill('Restaurante de Teste');
  await page.locator('#partner-name').fill('Bruno Teste');
  await page.locator('#partner-email').fill('bruno@example.test');
  await page.locator('#partner-city').selectOption('Porto');
  await page.locator('#partner-cuisine').selectOption('Outra');
  await page.locator('#partner-form [name="consent"]').check();
  await page.locator('#partner-form button[type="submit"]').click();
  await expect(page.locator('#modal-title')).toHaveText('O teu pedido ficou guardado.');
  await expect(page.locator('.inline-notice')).toContainText('Não foi enviado');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('marcas-tu:partner-request:v1')));
  expect(stored).toMatchObject({ restaurantName: 'Restaurante de Teste', email: 'bruno@example.test', city: 'Porto', cuisine: 'Outra' });
  await page.getByRole('button', { name: 'Continuar a explorar' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('navegação acessível e janelas funcionam no computador e no telemóvel', async ({ page }, testInfo) => {
  await page.goto('/');
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
    await expect(page.locator('#mobile-navigation')).toBeVisible();
    await page.locator('#mobile-navigation').getByRole('link', { name: 'As minhas reservas', exact: true }).click();
    await expect(page.locator('#mobile-navigation')).not.toBeVisible();
  } else {
    await page.locator('.desktop-nav').getByRole('link', { name: 'As minhas reservas', exact: true }).click();
  }
  await expect(page).toHaveURL(/#reservas$/);
  await page.locator('.skip-link').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
  await expect(page).toHaveURL(/#reservas$/);
  const privacyButton = page.getByRole('button', { name: 'Privacidade', exact: true });
  await privacyButton.click();
  await expect(page.locator('#modal-title')).toHaveText('Os teus dados ficam contigo.');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(privacyButton).toBeFocused();
  await page.getByRole('button', { name: 'Como funciona', exact: true }).click();
  await expect(page.locator('#como-funciona')).toBeInViewport();
  await expectNoHorizontalOverflow(page);
});
