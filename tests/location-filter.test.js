import test from 'node:test';
import assert from 'node:assert/strict';
import { filterRestaurants, chooseRestaurant } from '../src/data.js';

test('a localidade selecionada tem prioridade sobre uma cidade anterior', () => {
  const location = { type: 'municipality', name: 'Braga', municipality: 'Braga', district: 'Braga' };
  assert.deepEqual(filterRestaurants({ city: 'Lisboa', location }), []);
  assert.equal(chooseRestaurant({ city: 'Lisboa', location, budget: 40 }), null);
});

test('a pesquisa por distrito inclui os municípios correspondentes', () => {
  const matches = filterRestaurants({ location: { type: 'district', name: 'Lisboa' } });
  assert.equal(matches.length, 6);
  assert.deepEqual([...new Set(matches.map((restaurant) => restaurant.city))].sort(), ['Cascais', 'Lisboa']);
});

test('uma localidade não seleciona restaurantes de outra zona do mesmo município', () => {
  const estoril = { type: 'locality', name: 'Monte Estoril', municipality: 'Cascais' };
  assert.deepEqual(filterRestaurants({ location: estoril }).map((restaurant) => restaurant.id), ['casa-das-laranjeiras']);
  const carcavelos = { type: 'locality', name: 'Carcavelos', municipality: 'Cascais' };
  assert.deepEqual(filterRestaurants({ location: carcavelos }), []);
});

test('a surpresa respeita simultaneamente o município e o orçamento', () => {
  const location = { type: 'municipality', name: 'Porto', municipality: 'Porto' };
  assert.equal(chooseRestaurant({ location, budget: 25 })?.id, 'forno-da-rua');
});
