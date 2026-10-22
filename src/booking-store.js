import { restaurants } from './data.js';

const BOOKINGS_KEY = 'marcas-tu:bookings:v1';
const PROFILE_KEY = 'marcas-tu:profile:v1';
const memoryStore = new Map();
const memoryOnlyKeys = new Set();

function readJSON(key, defaultValue) {
  let raw = memoryStore.get(key) ?? null;
  try {
    if (globalThis.localStorage && !memoryOnlyKeys.has(key)) {
      raw = globalThis.localStorage.getItem(key);
      if (raw !== null) memoryStore.set(key, raw);
      else memoryStore.delete(key);
    }
  } catch {
    // O modo privado ou políticas do browser podem impedir o armazenamento.
  }
  if (raw === null) return defaultValue;
  try {
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

function writeJSON(key, value) {
  const serialized = JSON.stringify(value);
  memoryStore.set(key, serialized);
  try {
    if (globalThis.localStorage) {
      globalThis.localStorage.setItem(key, serialized);
      memoryOnlyKeys.delete(key);
    } else {
      memoryOnlyKeys.add(key);
    }
  } catch {
    memoryOnlyKeys.add(key);
  }
}

function cleanProfile(input = {}) {
  const name = String(input.name ?? '').trim();
  const email = String(input.email ?? '').trim().toLowerCase();
  if (name.length < 2 || name.length > 100) {
    throw new Error('Indica um nome entre 2 e 100 caracteres.');
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Indica um endereço de email válido.');
  }
  return { name, email };
}

function todayInLisbon() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function makeId() {
  return globalThis.crypto?.randomUUID?.()
    ?? `booking-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function getBookings() {
  const stored = readJSON(BOOKINGS_KEY, []);
  if (!Array.isArray(stored)) return [];
  return stored.filter((booking) => booking && typeof booking.id === 'string'
    && restaurants.some((restaurant) => restaurant.id === booking.restaurantId)
    && ['confirmed', 'cancelled'].includes(booking.status));
}

export function createBooking(input = {}) {
  const profile = cleanProfile(input);
  const restaurant = restaurants.find((item) => item.id === input.restaurantId);
  if (!restaurant) throw new Error('Escolhe um restaurante válido.');
  if (!validDate(input.date)) throw new Error('Escolhe uma data válida.');
  if (input.date < todayInLisbon()) throw new Error('A reserva tem de ser para hoje ou uma data futura.');
  if (!restaurant.times.includes(input.time)) throw new Error('Escolhe um horário disponível para este restaurante.');
  const guests = Number(input.guests);
  if (!Number.isInteger(guests) || guests < 1 || guests > 8) {
    throw new Error('Escolhe entre 1 e 8 pessoas.');
  }

  const bookings = getBookings();
  const duplicate = bookings.some((booking) => booking.status === 'confirmed'
    && booking.restaurantId === restaurant.id && booking.date === input.date
    && booking.time === input.time && booking.email === profile.email);
  if (duplicate) throw new Error('Já tens uma reserva confirmada neste restaurante para esse dia e hora.');

  const id = makeId();
  const booking = {
    id,
    reference: `MT-${id.replace(/[^a-z0-9]/gi, '').slice(-6).toUpperCase()}`,
    restaurantId: restaurant.id,
    ...profile,
    date: input.date,
    time: input.time,
    guests,
    surprise: input.surprise === true,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  };
  writeJSON(BOOKINGS_KEY, [booking, ...bookings]);
  return { ...booking };
}

export function cancelBooking(id) {
  const bookings = getBookings();
  const booking = bookings.find((item) => item.id === id);
  if (!booking) throw new Error('Não foi possível encontrar esta reserva.');
  if (booking.status === 'cancelled') return { ...booking };
  booking.status = 'cancelled';
  writeJSON(BOOKINGS_KEY, bookings);
  return { ...booking };
}

export function getProfile() {
  const profile = readJSON(PROFILE_KEY, null);
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return null;
  try {
    return cleanProfile(profile);
  } catch {
    return null;
  }
}

// Guarda apenas um perfil local de demonstração; não autentica o utilizador.
export function saveProfile(input) {
  const profile = cleanProfile(input);
  writeJSON(PROFILE_KEY, profile);
  return { ...profile };
}

export function clearProfile() {
  memoryStore.delete(PROFILE_KEY);
  memoryOnlyKeys.delete(PROFILE_KEY);
  try {
    globalThis.localStorage?.removeItem(PROFILE_KEY);
  } catch {
    memoryOnlyKeys.add(PROFILE_KEY);
  }
}
