import './style.css';
import { restaurants, filterRestaurants, chooseRestaurant } from './data.js';
import { getBookings, createBooking, cancelBooking, getProfile, saveProfile, clearProfile } from './booking-store.js';
import { homeView, exploreView, bookingsView, partnersView, bookingFormView, confirmationView, loginFormView, partnerFormView, partnerSuccessView, escapeHtml } from './views.js';
import { icon } from './icons.js';

const main = document.querySelector('#main-content');
const modal = document.querySelector('#site-modal');
const modalContent = document.querySelector('#modal-content');
const toast = document.querySelector('#toast');
const validRoutes = new Set(['home', 'explorar', 'reservas', 'restaurante']);
const favoritesKey = 'marcas-tu:favorites:v1';

function calendarDate(offset = 0) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = (type) => parts.find((item) => item.type === type).value;
  const day = new Date(`${part('year')}-${part('month')}-${part('day')}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + offset);
  return day.toISOString().slice(0, 10);
}

function readFavorites() {
  try {
    const stored = JSON.parse(localStorage.getItem(favoritesKey) || '[]');
    return new Set(Array.isArray(stored) ? stored.filter((id) => restaurants.some((item) => item.id === id)) : []);
  } catch { return new Set(); }
}

const state = {
  route: 'home', city: 'Lisboa', favorites: readFavorites(),
  filters: { query: '', city: 'Todas', cuisine: 'Todas', budget: '' },
  preferences: { city: 'Lisboa', date: calendarDate(1), guests: '2', budget: '40' },
  bookingContext: null, modalTrigger: null,
};

let toastTimeout;
function notify(message) {
  clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.add('visible');
  toastTimeout = setTimeout(() => toast.classList.remove('visible'), 4500);
}

function refreshHeader() {
  const profile = getProfile();
  const name = profile?.name.split(/\s+/)[0];
  const profileButton = document.querySelector('#profile-trigger');
  profileButton.textContent = name ? `Olá, ${name}` : 'O meu perfil';
  const count = getBookings().filter((booking) => booking.status === 'confirmed').length;
  for (const badge of document.querySelectorAll('.booking-count')) {
    badge.textContent = String(count);
    badge.hidden = !count;
  }
  for (const link of document.querySelectorAll('.nav-link')) {
    const active = link.hash === `#${state.route}`;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

function closeMenu() {
  const menu = document.querySelector('#mobile-navigation');
  menu.hidden = true;
  menu.classList.remove('open');
  document.querySelector('.menu-toggle').setAttribute('aria-expanded', 'false');
}

function render(focus = false) {
  const shared = { restaurants, favorites: state.favorites, profile: getProfile(), date: state.preferences.date };
  if (state.route === 'explorar') {
    main.innerHTML = exploreView({ ...shared, restaurants: filterRestaurants(state.filters), filters: state.filters });
  } else if (state.route === 'reservas') {
    main.innerHTML = bookingsView({ bookings: getBookings(), restaurants });
  } else if (state.route === 'restaurante') {
    main.innerHTML = partnersView(shared);
  } else {
    main.innerHTML = homeView({ ...shared, city: state.city });
    const form = document.querySelector('#search-form');
    if (form) {
      for (const [key, value] of Object.entries(state.preferences)) {
        if (form.elements.namedItem(key)) form.elements.namedItem(key).value = value;
      }
      const date = form.elements.namedItem('date');
      if (date) date.min = calendarDate();
    }
  }
  refreshHeader();
  if (focus) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    main.focus({ preventScroll: true });
  }
}

function readRoute() {
  const hash = window.location.hash.slice(1).split('?')[0];
  state.route = validRoutes.has(hash) ? hash : 'home';
  closeMenu();
  render(true);
}

function navigate(route) {
  if (modal.open) closeModal();
  if (window.location.hash === `#${route}`) {
    state.route = route;
    render(true);
  } else window.location.hash = route;
}

function showModal(content) {
  if (!modal.open) state.modalTrigger = document.activeElement;
  modalContent.innerHTML = content;
  if (!modal.open) modal.showModal();
  document.body.classList.add('modal-open');
  modal.scrollTop = 0;
  // Focus the heading so long forms begin at their introduction on mobile.
  const heading = modalContent.querySelector('#modal-title');
  if (heading) {
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }
}

function closeModal() {
  modal.close();
  document.body.classList.remove('modal-open');
  state.bookingContext = null;
  if (state.modalTrigger?.isConnected) state.modalTrigger.focus({ preventScroll: true });
}

function openBooking(restaurant, surprise = false, defaults = {}) {
  if (!restaurant) return;
  state.bookingContext = { restaurant, surprise };
  const profile = getProfile() || {};
  showModal(bookingFormView({ restaurant, surprise, defaults: {
    ...profile, ...state.preferences, time: restaurant.times.includes('20:00') ? '20:00' : restaurant.times[0],
    minDate: calendarDate(), ...defaults,
  } }));
}

function surprise(preferences = state.preferences) {
  const choice = chooseRestaurant({ city: preferences.city, budget: preferences.budget });
  if (!choice) {
    showModal(`<p class="modal-eyebrow">VAMOS ENCONTRAR A TUA MESA</p><h2 class="modal-title" id="modal-title">Ainda não temos essa combinação.</h2><p class="modal-intro">Experimenta outro orçamento ou explora os nossos restaurantes para encontrar um plano à tua medida.</p><button class="button button-dark button-wide" data-action="explore">Explorar restaurantes ${icon('arrowRight')}</button>`);
    return;
  }
  openBooking(choice, true, preferences);
}

function renderProfile(error = '', profile = getProfile()) {
  const logout = getProfile() ? '<button class="button button-ghost button-wide" data-action="clear-profile">Remover perfil deste dispositivo</button>' : '';
  showModal(loginFormView({ profile, error }) + logout);
}

function information(kind) {
  if (kind === 'privacy') {
    showModal('<p class="modal-eyebrow">PRIVACIDADE</p><h2 class="modal-title" id="modal-title">Os teus dados ficam contigo.</h2><p class="modal-intro">Esta versão guarda o perfil, os favoritos, as reservas e os pedidos de parceria apenas no armazenamento local deste browser. Os formulários não enviam dados a restaurantes nem a um servidor.</p><div class="inline-notice">O perfil é de demonstração e não tem autenticação. Qualquer pessoa com acesso a este browser pode consultar os dados guardados. Usa dados fictícios ao experimentar.</div><p class="form-hint">Podes remover o perfil no botão “O meu perfil” e apagar os restantes dados nas definições de armazenamento deste browser. Não usamos análises de tráfego nem cookies de publicidade.</p>');
  } else {
    showModal('<p class="modal-eyebrow">À VOLTA DE UMA BOA MESA</p><h2 class="modal-title" id="modal-title">Menos “onde vamos?”.<br>Mais “ainda bem que viemos”.</h2><p class="modal-intro">O «Marcas Tu?» nasceu para simplificar os planos à mesa. Escolhes a cidade, a data, o número de pessoas e o orçamento. Nós sugerimos um lugar para descobrires, ou podes explorar e escolher por ti.</p><div class="inline-notice">Estás a experimentar um protótipo: todos os restaurantes, avaliações e horários são fictícios e nenhuma reserva é enviada para um restaurante.</div><button class="button button-dark button-wide" data-action="explore">Encontrar a nossa mesa</button>');
  }
}

function askCancellation(id) {
  const booking = getBookings().find((item) => item.id === id);
  if (!booking || booking.status === 'cancelled') return;
  const restaurant = restaurants.find((item) => item.id === booking.restaurantId);
  showModal(`<p class="modal-eyebrow">OS PLANOS MUDAM</p><h2 class="modal-title" id="modal-title">Cancelar esta reserva?</h2><p class="modal-intro">A reserva de demonstração em ${escapeHtml(restaurant.name)} ficará no histórico como cancelada.</p><form id="cancel-form"><input type="hidden" name="bookingId" value="${escapeHtml(id)}"><button class="button button-dark button-wide" type="submit">Sim, cancelar reserva</button></form><button class="button button-ghost button-wide" data-action="close-modal">Manter a reserva</button>`);
}

function toggleFavorite(id, button) {
  if (!restaurants.some((item) => item.id === id)) return;
  const saved = state.favorites.has(id);
  if (saved) state.favorites.delete(id);
  else state.favorites.add(id);
  try { localStorage.setItem(favoritesKey, JSON.stringify([...state.favorites])); } catch { /* Keep favorites during this session. */ }
  button.classList.toggle('saved', !saved);
  button.setAttribute('aria-pressed', String(!saved));
  const restaurant = restaurants.find((item) => item.id === id);
  button.setAttribute('aria-label', `${saved ? 'Guardar' : 'Remover dos favoritos'} ${restaurant.name}`);
  notify(saved ? 'Restaurante removido dos favoritos.' : 'Restaurante guardado nos favoritos.');
}

function scrollHow() {
  if (state.route !== 'home') {
    state.route = 'home';
    history.replaceState(null, '', '#home');
    render();
  }
  closeMenu();
  document.querySelector('#como-funciona')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}

document.addEventListener('click', (event) => {
  if (event.target.closest('.skip-link')) {
    event.preventDefault();
    main.focus();
    main.scrollIntoView({ block: 'start' });
    return;
  }
  const button = event.target.closest('[data-action]');
  if (!button) return;
  event.preventDefault();
  const { action, id, city } = button.dataset;
  if (action === 'menu') {
    const menu = document.querySelector('#mobile-navigation');
    const open = menu.hidden;
    menu.hidden = !open;
    menu.classList.toggle('open', open);
    button.setAttribute('aria-expanded', String(open));
  } else if (action === 'profile' || action === 'login') renderProfile();
  else if (action === 'close-modal') closeModal();
  else if (action === 'book') openBooking(restaurants.find((item) => item.id === id));
  else if (action === 'surprise') surprise();
  else if (action === 'city') { state.city = city; state.preferences.city = city; render(); }
  else if (action === 'favorite') toggleFavorite(id, button);
  else if (action === 'explore') navigate('explorar');
  else if (action === 'view-bookings') navigate('reservas');
  else if (action === 'cancel-booking') askCancellation(id);
  else if (action === 'reset-filters') { state.filters = { query: '', city: 'Todas', cuisine: 'Todas', budget: '' }; render(); }
  else if (action === 'how') scrollHow();
  else if (action === 'about' || action === 'privacy') information(action);
  else if (['partner', 'partner-signup', 'join-partner'].includes(action)) showModal(partnerFormView({}));
  else if (action === 'clear-profile') { clearProfile(); refreshHeader(); closeModal(); notify('Perfil removido deste dispositivo.'); }
});

document.addEventListener('submit', (event) => {
  const form = event.target;
  const supported = ['search-form', 'filter-form', 'booking-form', 'profile-form', 'partner-form', 'cancel-form'];
  if (!supported.includes(form.id)) return;
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form));
  if (form.id === 'search-form') {
    state.preferences = { ...state.preferences, ...values };
    surprise(state.preferences);
  } else if (form.id === 'filter-form') {
    state.filters = { ...state.filters, ...values };
    render();
    document.querySelector('.results-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else if (form.id === 'booking-form') {
    const context = state.bookingContext;
    if (!context) return;
    try {
      if (!values.consent) throw new Error('Confirma que compreendes que esta reserva é de demonstração.');
      const booking = createBooking({ ...values, restaurantId: context.restaurant.id, surprise: context.surprise });
      state.preferences.date = booking.date;
      state.preferences.guests = String(booking.guests);
      refreshHeader();
      showModal(confirmationView({ booking, restaurant: context.restaurant }));
      state.bookingContext = null;
    } catch (error) {
      showModal(bookingFormView({ ...context, defaults: { ...values, minDate: calendarDate() }, error: error.message }));
    }
  } else if (form.id === 'profile-form') {
    try {
      saveProfile(values);
      refreshHeader();
      closeModal();
      notify('Perfil de demonstração guardado neste dispositivo.');
    } catch (error) { renderProfile(error.message, values); }
  } else if (form.id === 'cancel-form') {
    try {
      cancelBooking(values.bookingId);
      closeModal();
      render();
      notify('Reserva de demonstração cancelada.');
    } catch (error) { notify(error.message); }
  } else if (form.id === 'partner-form') {
    try {
      if (!values.consent) throw new Error('Confirma que este pedido é apenas uma demonstração.');
      for (const key of ['restaurantName', 'name', 'email', 'city', 'cuisine']) {
        values[key] = String(values[key] || '').trim();
        const maximum = key === 'email' ? 254 : 150;
        if (!values[key] || values[key].length > maximum) throw new Error('Preenche todos os campos com dados válidos.');
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) throw new Error('Indica um endereço de email válido.');
      let persisted = true;
      try {
        localStorage.setItem('marcas-tu:partner-request:v1', JSON.stringify({ ...values, createdAt: new Date().toISOString() }));
      } catch { persisted = false; }
      showModal(partnerSuccessView({ persisted }));
    } catch (error) { showModal(partnerFormView({ error: error.message, defaults: values })); }
  }
});

modal.addEventListener('click', (event) => {
  if (event.target === modal) {
    const rect = modal.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeModal();
  }
});
modal.addEventListener('cancel', (event) => { event.preventDefault(); closeModal(); });
modal.addEventListener('close', () => document.body.classList.remove('modal-open'));
window.addEventListener('hashchange', readRoute);
window.addEventListener('storage', () => { state.favorites = readFavorites(); render(); });
document.querySelector('#current-year').textContent = new Date().getFullYear();
readRoute();
