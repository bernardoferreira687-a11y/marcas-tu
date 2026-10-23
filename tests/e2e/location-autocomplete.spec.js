import { test, expect } from '@playwright/test';

const locationInput = (page) => page.locator('#home-city');
const suggestions = (page) => page.locator('#home-city-options');

async function chooseLocation(page, query, label) {
  await locationInput(page).fill(query);
  const option = suggestions(page).getByRole('option', { name: label, exact: true });
  await expect(option).toBeVisible();
  await option.click();
  await expect(locationInput(page)).toHaveValue(label);
  await expect(locationInput(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(suggestions(page)).not.toBeVisible();
}

async function expectDropdownWithinViewport(page) {
  const bounds = await suggestions(page).boundingBox();
  expect(bounds).not.toBeNull();
  const viewport = page.viewportSize();
  expect(bounds.x).toBeGreaterThanOrEqual(-2);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width + 2);
  expect(bounds.y).toBeGreaterThanOrEqual(-2);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height + 2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width + 1);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(locationInput(page)).toHaveAttribute('role', 'combobox');
});

test('digitar pesquisa municípios para além das três cidades de demonstração', async ({ page }) => {
  const input = locationInput(page);
  await input.fill('Brag');
  await expect(suggestions(page)).toBeVisible();
  await expect(input).toHaveAttribute('aria-expanded', 'true');
  const braga = suggestions(page).getByRole('option', { name: 'Braga', exact: true });
  await expect(braga).toBeVisible();
  await expect(braga).toContainText('Município');
  await expect(suggestions(page).getByRole('option', { name: 'Lisboa', exact: true })).toHaveCount(0);
  await expectDropdownWithinViewport(page);
  await braga.click();
  await expect(input).toHaveValue('Braga');
  await chooseLocation(page, 'vila nova de gaia', 'Vila Nova de Gaia');
});

test('aceita uma vila desambiguada e municípios de ambas as regiões autónomas', async ({ page }) => {
  await chooseLocation(page, 'Ericeira', 'Ericeira, Mafra');
  await chooseLocation(page, 'Funchal', 'Funchal');
  await chooseLocation(page, 'Ponta Delgada', 'Ponta Delgada');
  await expect(locationInput(page)).not.toHaveAttribute('aria-invalid', 'true');
});

test('pesquisa sem acentos e navegação por teclado selecionam a localidade', async ({ page }) => {
  const input = locationInput(page);
  await input.fill('sao joao da madeira');
  const municipality = suggestions(page).getByRole('option', { name: 'São João da Madeira', exact: true });
  await expect(municipality).toBeVisible();
  await input.press('ArrowDown');
  await expect(municipality).toHaveAttribute('aria-selected', 'true');
  const activeId = await municipality.getAttribute('id');
  await expect(input).toHaveAttribute('aria-activedescendant', activeId);
  await input.press('Enter');
  await expect(input).toHaveValue('São João da Madeira');
  await expect(suggestions(page)).not.toBeVisible();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await input.press('Enter');
  await expect(page.locator('#modal-title')).toHaveText('Ainda não temos mesas nesta zona.');
  await expect(page.locator('#modal-content')).toContainText('São João da Madeira');
  await expect(page.locator('#booking-form')).toHaveCount(0);
});

test('Escape, Tab e clique fora fecham sugestões sem escolher um resultado por engano', async ({ page }) => {
  const input = locationInput(page);
  await input.fill('Brag');
  await expect(suggestions(page)).toBeVisible();
  await input.press('Escape');
  await expect(suggestions(page)).not.toBeVisible();
  await expect(input).toHaveValue('Brag');
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  await input.fill('Gaia');
  await expect(suggestions(page)).toBeVisible();
  await input.press('Tab');
  await expect(suggestions(page)).not.toBeVisible();
  await expect(input).not.toBeFocused();
  await expect(input).toHaveValue('Gaia');
  await input.fill('Tavira');
  await expect(suggestions(page)).toBeVisible();
  await page.getByRole('heading', { level: 1 }).click();
  await expect(suggestions(page)).not.toBeVisible();
  await expect(input).toHaveValue('Tavira');
});

test('texto sem correspondências não submete nem reutiliza a localização anterior', async ({ page }) => {
  await chooseLocation(page, 'Port', 'Porto');
  const input = locationInput(page);
  await input.fill('zzzzlocalidadenaoexistente');
  await expect(suggestions(page).getByRole('option')).toHaveCount(0);
  await expect(suggestions(page)).toContainText('Não encontrámos localidades.');
  await page.locator('#search-form button[type="submit"]').click();
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('#booking-form')).toHaveCount(0);
  await expect(input).toHaveValue('zzzzlocalidadenaoexistente');
  await chooseLocation(page, 'Port', 'Porto');
  await page.locator('#home-budget').selectOption('25');
  await page.locator('#search-form button[type="submit"]').click();
  await expect(page.locator('.reveal-details h3')).toHaveText('Forno da Rua');
  await expect(page.locator('.reveal-details .card-location')).toContainText('Porto');
});

test('uma localização válida sem restaurantes mostra a ausência de oferta sem cair em Lisboa', async ({ page }) => {
  await chooseLocation(page, 'Port', 'Porto');
  await chooseLocation(page, 'Braga', 'Braga');
  await page.locator('#home-budget').selectOption('75');
  await page.locator('#search-form button[type="submit"]').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('#modal-title')).toHaveText('Ainda não temos mesas nesta zona.');
  await expect(page.locator('#modal-content')).toContainText('Braga');
  await expect(page.locator('#modal-content')).toContainText('restaurantes de demonstração');
  await expect(page.locator('#booking-form')).toHaveCount(0);
  await expect(page.locator('.reveal-details')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width + 1);
});
