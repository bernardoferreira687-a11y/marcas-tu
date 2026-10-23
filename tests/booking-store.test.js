import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { restaurants, filterRestaurants, chooseRestaurant } from '../src/data.js';

let store;
let values;

beforeEach(async () => {
  values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  store = await import(`../src/booking-store.js?test=${Math.random()}`);
});

const sample = (overrides = {}) => ({
  restaurantId: restaurants[0].id,
  name: 'Ana Silva',
  email: 'ana@example.pt',
  date: '2099-06-15',
  time: restaurants[0].times[0],
  guests: 2,
  ...overrides,
});

test('filtra cidade, cozinha, preço e pesquisa sem acentos em conjunto', () => {
  const matches = filterRestaurants({ city: 'Lisboa', cuisine: 'Portuguesa', budget: 30, query: 'principe' });
  assert.deepEqual(matches.map((item) => item.id), ['casa-do-largo']);
  assert.equal(filterRestaurants({ city: 'Porto', budget: 25 }).length, 1);
  assert.equal(filterRestaurants({ cuisine: 'Todas', city: 'Todas' }).length, restaurants.length);
});

test('a escolha surpresa só usa restaurantes que correspondem às preferências', () => {
  const filters = { city: 'Porto', cuisine: 'Italiana', budget: 25 };
  const selected = chooseRestaurant(filters);
  assert.equal(selected.id, 'forno-da-rua');
  assert.equal(chooseRestaurant({ city: 'Lisboa', budget: 1 }), null);
  assert.equal(chooseRestaurant({ city: 'Cidade inexistente' }), null);
});

test('cria e persiste uma reserva e recupera-a numa nova instância', async () => {
  const booking = store.createBooking(sample({ surprise: true, email: ' ANA@EXAMPLE.PT ' }));
  assert.equal(booking.email, 'ana@example.pt');
  assert.equal(booking.status, 'confirmed');
  assert.equal(booking.surprise, true);
  assert.match(booking.reference, /^MT-[A-Z0-9]{6}$/);
  assert.equal(store.getBookings()[0].id, booking.id);
  const reloaded = await import(`../src/booking-store.js?reload=${Math.random()}`);
  assert.equal(reloaded.getBookings()[0].id, booking.id);
  booking.name = 'Mudado fora do armazenamento';
  assert.equal(store.getBookings()[0].name, 'Ana Silva');
});

test('rejeita datas impossíveis, mal formatadas e no passado', () => {
  for (const date of ['2099-02-30', '2099-02-29', '2099-13-01', '15/06/2099', '', null]) {
    assert.throws(() => store.createBooking(sample({ date })), /data válida/);
  }
  assert.throws(() => store.createBooking(sample({ date: '2000-01-01' })), /data futura/);
  assert.equal(store.getBookings().length, 0);
});

test('rejeita nome, email, restaurante, horário e número de pessoas inválidos', () => {
  assert.throws(() => store.createBooking(sample({ name: ' ' })), /nome/);
  assert.throws(() => store.createBooking(sample({ email: 'sem-email' })), /email/);
  assert.throws(() => store.createBooking(sample({ restaurantId: 'desconhecido' })), /restaurante válido/);
  assert.throws(() => store.createBooking(sample({ time: '03:00' })), /horário disponível/);
  for (const guests of [
    '', ' ', 0, '0', -1, '-9', 1.5, '2.5', 'abc', NaN, Infinity, -Infinity,
    'NaN', 'Infinity', Number.MAX_SAFE_INTEGER + 1, String(Number.MAX_SAFE_INTEGER + 1),
    null, undefined, true, false, [], {},
  ]) {
    assert.throws(() => store.createBooking(sample({ guests })), /número inteiro de pessoas/);
  }
  assert.equal(store.getBookings().length, 0);
});

test('aceita e persiste grupos acima de oito sem um máximo de negócio', async () => {
  const sizes = [1, 9, 12, 25, 100, '9', '12', '25', '100', Number.MAX_SAFE_INTEGER, String(Number.MAX_SAFE_INTEGER)];
  sizes.forEach((guests, index) => {
    const booking = store.createBooking(sample({ guests, email: `grupo-${index}@example.pt` }));
    assert.equal(booking.guests, Number(guests));
    assert.equal(typeof booking.guests, 'number');
  });
  const reloaded = await import(`../src/booking-store.js?groups=${Math.random()}`);
  assert.deepEqual(reloaded.getBookings().map((booking) => booking.guests), sizes.map(Number).reverse());
});

test('impede duplicados confirmados e permite voltar a reservar depois de cancelar', () => {
  const booking = store.createBooking(sample());
  assert.throws(() => store.createBooking(sample({ email: 'ANA@EXAMPLE.PT' })), /Já tens uma reserva/);
  assert.equal(store.cancelBooking(booking.id).status, 'cancelled');
  assert.equal(store.cancelBooking(booking.id).status, 'cancelled');
  const replacement = store.createBooking(sample());
  assert.notEqual(replacement.id, booking.id);
  assert.equal(store.getBookings().length, 2);
  assert.equal(store.getBookings().filter((item) => item.status === 'cancelled').length, 1);
  assert.throws(() => store.cancelBooking('inexistente'), /encontrar/);
});

test('guarda e limpa um perfil local sem apagar o histórico de reservas', () => {
  assert.equal(store.getProfile(), null);
  store.createBooking(sample());
  store.saveProfile({ name: ' Ana Silva ', email: ' ANA@EXAMPLE.PT ' });
  assert.deepEqual(store.getProfile(), { name: 'Ana Silva', email: 'ana@example.pt' });
  store.clearProfile();
  assert.equal(store.getProfile(), null);
  assert.equal(store.getBookings().length, 1);
});

test('mantém a demonstração funcional em memória quando localStorage está bloqueado', () => {
  globalThis.localStorage = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
    removeItem() { throw new Error('blocked'); },
  };
  const booking = store.createBooking(sample());
  store.saveProfile(sample());
  assert.equal(store.getBookings()[0].id, booking.id);
  assert.equal(store.getProfile().name, 'Ana Silva');
  store.cancelBooking(booking.id);
  assert.equal(store.getBookings()[0].status, 'cancelled');
  store.clearProfile();
  assert.equal(store.getProfile(), null);
});

test('ignora dados armazenados corrompidos sem bloquear a aplicação', () => {
  values.set('marcas-tu:bookings:v1', '{broken');
  values.set('marcas-tu:profile:v1', '{broken');
  assert.deepEqual(store.getBookings(), []);
  assert.equal(store.getProfile(), null);
  assert.equal(store.createBooking(sample()).status, 'confirmed');
});
