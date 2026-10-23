import test from 'node:test';
import assert from 'node:assert/strict';
import { locations, searchLocations, findExactLocation, getLocationById } from '../src/locations.js';

const normalize = (value) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

test('inclui 308 municípios, os 18 distritos e milhares de localidades offline', () => {
  assert.equal(locations.filter((item) => item.type === 'municipality').length, 308);
  assert.equal(locations.filter((item) => item.type === 'district').length, 18);
  assert.ok(locations.filter((item) => item.type === 'locality').length > 32_000);
  assert.equal(new Set(locations.map((item) => item.id)).size, locations.length);
  assert.equal(new Set(locations.map((item) => normalize(item.label))).size, locations.length);
});

test('mantém municípios canónicos em vez de duplicar as respetivas localidades', () => {
  for (const name of ['Lisboa', 'Porto', 'Cascais', 'Braga', 'Vila Nova de Gaia']) {
    const selected = findExactLocation(name);
    assert.equal(selected.type, 'municipality');
    assert.equal(selected.name, name);
    assert.equal(selected.label, name);
    assert.equal(searchLocations(name)[0].id, selected.id);
    assert.equal(locations.filter((item) => item.type === 'locality'
      && normalize(item.name) === normalize(name) && item.municipality === name).length, 0);
  }
});

test('cobre os municípios das onze ilhas sem classificar ilhas como distritos', () => {
  const expected = [
    ['Funchal', 'Ilha da Madeira', 'Madeira'],
    ['Porto Santo', 'Ilha de Porto Santo', 'Madeira'],
    ['Vila do Porto', 'Ilha de Santa Maria', 'Açores'],
    ['Ponta Delgada', 'Ilha de São Miguel', 'Açores'],
    ['Angra do Heroísmo', 'Ilha Terceira', 'Açores'],
    ['Santa Cruz da Graciosa', 'Ilha da Graciosa', 'Açores'],
    ['Velas', 'Ilha de São Jorge', 'Açores'],
    ['Madalena', 'Ilha do Pico', 'Açores'],
    ['Horta', 'Ilha do Faial', 'Açores'],
    ['Santa Cruz das Flores', 'Ilha das Flores', 'Açores'],
    ['Corvo', 'Ilha do Corvo', 'Açores'],
  ];
  for (const [name, district, region] of expected) {
    const selected = findExactLocation(name);
    assert.equal(selected.type, 'municipality');
    assert.equal(selected.district, district);
    assert.equal(selected.region, region);
  }
  assert.equal(locations.some((item) => item.type === 'district' && item.region !== 'Continente'), false);
});

test('inclui localidades de vilas sem inventar uma classificação legal', () => {
  const ericeira = findExactLocation('Ericeira, Mafra');
  assert.equal(ericeira.name, 'Ericeira');
  assert.equal(ericeira.type, 'locality');
  assert.equal(ericeira.municipality, 'Mafra');
  const raboDePeixe = findExactLocation('Rabo de Peixe, Ribeira Grande');
  assert.equal(raboDePeixe.type, 'locality');
  assert.equal(raboDePeixe.region, 'Açores');
});

test('normaliza acentos, cedilhas, maiúsculas e espaços em pesquisa e seleção', () => {
  assert.equal(searchLocations('  SAO JOAO DA MADEIRA  ')[0].name, 'São João da Madeira');
  assert.equal(findExactLocation('  camara  de  lobos ').name, 'Câmara de Lobos');
  assert.equal(findExactLocation(' evora ').name, 'Évora');
  assert.equal(searchLocations('braganca')[0].name, 'Bragança');
  assert.equal(searchLocations('  rabo de peixe  ')[0].label, 'Rabo de Peixe, Ribeira Grande');
});

test('preserva localidades homónimas e exige desambiguação na seleção exata', () => {
  assert.equal(findExactLocation('Santo André'), null);
  const barreiro = findExactLocation('santo andre, barreiro');
  const mangualde = findExactLocation('Santo André, Mangualde');
  assert.equal(barreiro.municipality, 'Barreiro');
  assert.equal(mangualde.municipality, 'Mangualde');
  assert.notEqual(barreiro.id, mangualde.id);
  assert.equal(searchLocations('santo andre barreiro')[0].id, barreiro.id);
  assert.equal(findExactLocation('Ericeira'), null);
  assert.deepEqual(searchLocations('ericeira').map((item) => item.label), ['Ericeira, Mafra', 'Ericeira, Santiago do Cacém']);
});

test('pesquisa o município e metadados geográficos das localidades', () => {
  assert.ok(searchLocations('Mafra', { limit: 1_000 }).some((item) => item.label === 'Ericeira, Mafra'));
  assert.ok(searchLocations('sao miguel', { limit: 1_000 }).some((item) => item.label === 'Rabo de Peixe, Ribeira Grande'));
  assert.equal(findExactLocation('Lagoa (Algarve)').region, 'Continente');
  assert.equal(findExactLocation('Lagoa (São Miguel)').region, 'Açores');
});

test('dá prioridade a nomes exatos e prefixos e respeita limites superiores a oito', () => {
  assert.equal(searchLocations('Porto')[0].label, 'Porto');
  assert.equal(searchLocations('Casca')[0].label, 'Cascais');
  assert.equal(searchLocations('sao', { limit: 16 }).length, 16);
  assert.equal(searchLocations('sao', { limit: 0 }).length, 0);
  assert.equal(searchLocations('sao', { limit: 3 }).length, 3);
  assert.deepEqual(searchLocations('').slice(0, 3).map((item) => item.name), ['Lisboa', 'Porto', 'Cascais']);
});

test('recupera por ID estável e não transforma texto arbitrário numa seleção', () => {
  const lisboa = getLocationById('municipality:1106');
  assert.equal(lisboa.name, 'Lisboa');
  assert.equal(findExactLocation(lisboa.id), lisboa);
  assert.equal(searchLocations(lisboa.id)[0], lisboa);
  assert.equal(getLocationById('desconhecido'), null);
  assert.equal(findExactLocation('Port'), null);
  assert.equal(findExactLocation(''), null);
  assert.deepEqual(searchLocations('cidade que nao existe 987654321'), []);
});
