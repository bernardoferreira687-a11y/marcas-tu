import { icon } from './icons.js';

export const escapeHtml = (value = '') => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
export const money = (value) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(value) || 0);
export function formatDate(value, options = {}) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? String(value || '') : new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'long', ...options }).format(date);
}
const cities = ['Lisboa', 'Porto', 'Cascais'];
const cuisines = ['Portuguesa', 'Italiana', 'Mediterrânica', 'Japonesa'];
const selected = (a, b) => String(a) === String(b) ? ' selected' : '';
const isFavorite = (favorites, id) => favorites instanceof Set ? favorites.has(id) : Array.isArray(favorites) && favorites.includes(id);
const options = (values, current) => values.map((value) => `<option value="${escapeHtml(value)}"${selected(value, current)}>${escapeHtml(value)}</option>`).join('');
const dateToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const budgetOptions = (current) => [25, 35, 40, 50, 75].map((value) => `<option value="${value}"${selected(value, current)}>Até ${money(value)} / pessoa</option>`).join('');

function restaurantCard(restaurant, favorites) {
  const favorite = isFavorite(favorites, restaurant.id);
  return `<article class="restaurant-card">
    <div class="card-image-wrap">
      <img class="card-image" src="${escapeHtml(restaurant.image)}" alt="Ambiente ilustrativo de ${escapeHtml(restaurant.name)}" loading="lazy" width="600" height="450">
      <span class="card-tag">${escapeHtml(restaurant.tags?.[0] || restaurant.cuisine)}</span>
      <button type="button" class="favorite-button${favorite ? ' saved' : ''}" data-action="favorite" data-id="${escapeHtml(restaurant.id)}" aria-label="${favorite ? 'Remover' : 'Guardar'} ${escapeHtml(restaurant.name)} nos favoritos" aria-pressed="${favorite}">${icon('heart')}</button>
    </div>
    <div class="card-body">
      <div class="card-topline"><span class="card-location">${escapeHtml(restaurant.neighborhood)} · ${escapeHtml(restaurant.city)}</span><span class="card-rating" title="Avaliação fictícia de demonstração">${icon('star')} ${escapeHtml(restaurant.rating)}</span></div>
      <h3 class="card-title">${escapeHtml(restaurant.name)}</h3>
      <p class="card-description">${escapeHtml(restaurant.cuisine)} · ${escapeHtml(restaurant.tags?.[1] || 'À tua espera')}</p>
      <div class="card-bottom"><span class="card-price"><strong>${escapeHtml(money(restaurant.price))}</strong> / pessoa</span><button class="card-book" type="button" data-action="book" data-id="${escapeHtml(restaurant.id)}" aria-label="Reservar mesa em ${escapeHtml(restaurant.name)}">Reservar ${icon('arrowRight')}</button></div>
    </div>
  </article>`;
}

export function homeView({ restaurants = [], city = 'Lisboa', favorites = [], profile, date = '' } = {}) {
  const visible = restaurants.filter((restaurant) => restaurant.city === city).slice(0, 4);
  return `<section class="hero container" aria-labelledby="home-title">
    <div class="hero-copy">
      <p class="eyebrow"><span class="eyebrow-dot"></span> MENOS PLANOS. MAIS BONS MOMENTOS.</p>
      <h1 class="hero-title" id="home-title">A melhor mesa?<br><em>Deixa connosco.</em></h1>
      <p class="hero-description">Tu escolhes a companhia e o momento. Nós encontramos aquele restaurante que ainda não sabias que ias adorar.</p>
      <a class="text-link hero-how-link" data-action="how" href="#home">E como funciona? ${icon('arrowRight')}</a>
      <div class="trust-row"><div class="avatar-stack" aria-hidden="true"><span class="avatar">B</span><span class="avatar">M</span><span class="avatar">A</span><span class="avatar">J</span></div><div class="trust-copy"><span class="stars" aria-hidden="true">✦ ✦ ✦ ✦ ✦</span><span>Boas histórias começam à mesa.</span></div></div>
    </div>
    <div class="hero-visual">
      <div class="photo-backdrop" aria-hidden="true"></div>
      <img class="hero-photo" src="/images/restaurant-1.png" alt="Um restaurante acolhedor, pronto para o próximo encontro à mesa" width="640" height="760" fetchpriority="high">
      <img class="hero-small-photo" src="/images/restaurant-2.png" alt="Uma mesa posta para partilhar bons momentos" width="320" height="360">
      <span class="photo-label">Uma mesa. Mil possibilidades.</span>
      <div class="floating-note"><span class="floating-icon">${icon('sparkles')}</span><span>A tua próxima<br><strong>boa memória.</strong></span></div>
      <span class="vertical-caption">ESCOLHIDO COM CUIDADO, PARA TI.</span>
    </div>
  </section>
  <section class="search-wrap container" aria-label="Encontrar a tua próxima mesa">
    <form id="search-form" class="search-panel">
      <div class="search-field location-field" data-location-autocomplete>
        <span class="field-icon">${icon('pin')}</span>
        <div class="field-copy">
          <label for="home-city">Onde vamos?</label>
          <input id="home-city" name="city" type="text" value="${escapeHtml(city)}" placeholder="Cidade, vila ou localidade" autocomplete="off" spellcheck="false" role="combobox" aria-autocomplete="list" aria-haspopup="listbox" aria-expanded="false" aria-controls="home-city-options" aria-describedby="home-city-hint" data-location-input required>
        </div>
        <button class="location-clear" type="button" aria-label="Limpar localidade" data-location-clear>${icon('close')}</button>
        <div id="home-city-options" class="location-suggestions" role="listbox" aria-label="Localidades de Portugal" data-location-options hidden></div>
        <span id="home-city-hint" class="sr-only">Escreve uma cidade, município, vila ou localidade de Portugal e escolhe uma sugestão. Podes usar as setas e Enter.</span>
        <span class="sr-only" role="status" aria-live="polite" aria-atomic="true" data-location-status></span>
      </div>
      <div class="search-field"><span class="field-icon">${icon('calendar')}</span><div class="field-copy"><label for="home-date">Quando?</label><input id="home-date" name="date" type="date" value="${escapeHtml(date)}" min="${dateToday()}" required aria-label="Data da reserva"></div></div>
      <div class="search-field"><span class="field-icon">${icon('users')}</span><div class="field-copy"><label for="home-guests">Quantas pessoas?</label><select id="home-guests" name="guests">${Array.from({ length: 8 }, (_, i) => `<option value="${i + 1}"${selected(i + 1, 2)}>${i + 1} ${i === 0 ? 'pessoa' : 'pessoas'}</option>`).join('')}</select></div></div>
      <div class="search-field"><span class="field-icon">${icon('utensils')}</span><div class="field-copy"><label for="home-budget">O teu orçamento</label><select id="home-budget" name="budget">${budgetOptions(40)}</select></div></div>
      <button class="button button-primary search-submit" type="submit">Surpreende-me ${icon('sparkles')}</button>
    </form>
    <p class="search-caption">Preferes escolher? <a href="#explorar">Explora os restaurantes ${icon('arrowRight')}</a><span>Sem complicações. Só vontade de ir.</span></p>
  </section>
  <div class="benefits-strip"><div class="container"><span class="benefit">${icon('check')} A tua mesa, sem complicações</span><span class="benefit">${icon('heart')} Lugares para querer voltar</span><span class="benefit">${icon('sparkles')} Uma surpresa à tua medida</span></div></div>
  <section class="section container" aria-labelledby="restaurants-title">
    <div class="section-heading"><div><p class="section-kicker">O PRÓXIMO “TEMOS DE VOLTAR CÁ”</p><h2 class="section-title" id="restaurants-title">Há uma mesa à tua espera.</h2><p class="section-subtitle">Pequenos refúgios, grandes sabores e bons pretextos para sair.</p></div><a class="text-link" href="#explorar">Explorar todos ${icon('arrowRight')}</a></div>
    <div class="city-tabs" role="group" aria-label="Escolher cidade">${cities.map((value) => `<button class="city-tab${value === city ? ' active' : ''}" type="button" data-action="city" data-city="${escapeHtml(value)}" aria-pressed="${value === city}">${icon('pin')} ${escapeHtml(value)}</button>`).join('')}</div>
    <div class="restaurant-grid">${visible.map((restaurant) => restaurantCard(restaurant, favorites)).join('')}</div>
  </section>
  <section class="how-section" id="como-funciona" aria-labelledby="how-title"><div class="container">
    <div class="section-heading"><div><p class="section-kicker">É TÃO SIMPLES QUANTO PARECE</p><h2 class="section-title" id="how-title">Menos “onde vamos?”.<br>Mais “vamos a isso”.</h2></div><p class="section-subtitle">Deixa os separadores abertos.<br>Fecha só o plano.</p></div>
    <div class="how-grid">
      <article class="how-step"><span class="step-number">01</span><span class="step-icon">${icon('pin')}</span><h3 class="step-title">Diz-nos o que te apetece.</h3><p class="step-copy">Escolhe a cidade, o dia, a companhia e quanto queres gastar. O resto pode ficar por nossa conta.</p></article>
      <article class="how-step"><span class="step-number">02</span><span class="step-icon">${icon('sparkles')}</span><h3 class="step-title">Descobre a tua mesa.</h3><p class="step-copy">Deixa-te surpreender pela nossa escolha ou explora os restaurantes e segue a tua vontade.</p></article>
      <article class="how-step"><span class="step-number">03</span><span class="step-icon">${icon('utensils')}</span><h3 class="step-title">Guarda um bom momento.</h3><p class="step-copy">Confirma os detalhes e experimenta o percurso de reserva. Nesta versão, os planos são de demonstração.</p></article>
    </div>
  </div></section>
  <section class="section container"><div class="surprise-banner"><div class="surprise-copy"><p class="section-kicker">PARA QUEM GOSTA DE UM BOM IMPREVISTO</p><h2 class="surprise-title">O melhor plano pode ser<br><em>não ter tudo planeado.</em></h2><p>Os mesmos gostos. Um lugar novo. Deixa-nos escolher o cenário do teu próximo jantar.</p><button class="button button-primary" type="button" data-action="surprise">Quero uma surpresa ${icon('sparkles')}</button></div><img class="surprise-photo" src="/images/restaurant-1.png" alt="Um novo lugar para descobrir à mesa" loading="lazy" width="600" height="560"></div></section>
  <section class="container partners-banner"><div class="partners-copy"><p class="section-kicker">DO OUTRO LADO DA MESA</p><h2>Tens um restaurante?<br>Vamos pôr mais histórias à tua mesa.</h2><p>Faz parte dos próximos bons encontros.</p></div><div class="partners-actions"><a class="button button-dark" href="#restaurante">Conhecer a plataforma ${icon('arrowRight')}</a></div></section>`;
}

export function exploreView({ restaurants = [], filters = {}, favorites = [], date } = {}) {
  return `<section class="container page-heading"><a href="#home" class="breadcrumb">Início / Explorar</a><p class="section-kicker">SEGUE A TUA VONTADE</p><h1 class="page-title">O teu próximo lugar favorito.</h1><p class="page-intro">Uma mesa a dois, um jantar entre amigos ou só um bom pretexto para sair.</p></section>
  <section class="container" aria-label="Pesquisar restaurantes"><form id="filter-form" class="filter-bar">
    <div class="filter-field"><label for="filter-query">O que procuras?</label><input id="filter-query" name="query" type="search" placeholder="Restaurante, bairro ou cozinha" value="${escapeHtml(filters.query)}"></div>
    <div class="filter-field"><label for="filter-city">Cidade</label><select id="filter-city" name="city">${options(['Todas', ...cities], filters.city || 'Todas')}</select></div>
    <div class="filter-field"><label for="filter-cuisine">Tipo de cozinha</label><select id="filter-cuisine" name="cuisine">${options(['Todas', ...cuisines], filters.cuisine || 'Todas')}</select></div>
    <div class="filter-field"><label for="filter-budget">Por pessoa</label><select id="filter-budget" name="budget"><option value=""${selected('', filters.budget || '')}>Qualquer orçamento</option>${budgetOptions(filters.budget)}</select></div>
    <button class="button button-dark" type="submit">${icon('search')} Encontrar mesas</button>
  </form></section>
  <section class="section container" aria-label="Resultados da pesquisa"><div class="results-heading"><h2 class="results-count">${restaurants.length} ${restaurants.length === 1 ? 'mesa para descobrir' : 'mesas para descobrir'}</h2><button class="text-link" type="button" data-action="reset-filters">Limpar filtros</button></div>
    ${restaurants.length ? `<div class="restaurant-grid">${restaurants.map((restaurant) => restaurantCard(restaurant, favorites)).join('')}</div>` : `<div class="empty-state"><div class="empty-icon">${icon('search')}</div><h2 class="empty-title">Ainda não encontrámos essa mesa.</h2><p class="empty-copy">Experimenta outra cidade, cozinha ou orçamento. Há mais lugares para descobrir.</p><button class="button button-dark" type="button" data-action="reset-filters">Ver todos os restaurantes</button></div>`}
  </section>`;
}

export function bookingsView({ bookings = [], restaurants = [] } = {}) {
  return `<section class="container page-heading"><a href="#home" class="breadcrumb">Início / As minhas reservas</a><p class="section-kicker">OS TEUS PRÓXIMOS BONS MOMENTOS</p><h1 class="page-title">Há planos à tua espera.</h1><p class="page-intro">Consulta e gere as reservas de demonstração guardadas neste dispositivo.</p></section>
  <section class="container section booking-list" aria-label="As minhas reservas">${bookings.length ? bookings.map((booking) => {
    const restaurant = restaurants.find((item) => item.id === booking.restaurantId);
    if (!restaurant) return '';
    const cancelled = booking.status === 'cancelled';
    return `<article class="booking-card"><img class="booking-image" src="${escapeHtml(restaurant.image)}" alt="Ambiente ilustrativo de ${escapeHtml(restaurant.name)}" width="300" height="220"><div class="booking-details"><span class="booking-status${cancelled ? ' cancelled' : ''}">${cancelled ? 'Cancelada' : 'Confirmada · demonstração'}</span><p class="card-location">${escapeHtml(restaurant.neighborhood)} · ${escapeHtml(restaurant.city)}</p><h2 class="card-title">${escapeHtml(restaurant.name)}</h2><div class="booking-facts"><span>${icon('calendar')} ${escapeHtml(formatDate(booking.date))}</span><span>${icon('clock')} ${escapeHtml(booking.time)}</span><span>${icon('users')} ${escapeHtml(booking.guests)} ${booking.guests === 1 ? 'pessoa' : 'pessoas'}</span></div><p class="form-hint">Referência ${escapeHtml(booking.reference)}${booking.surprise ? ' · Uma escolha surpresa' : ''}</p></div><div class="booking-actions">${cancelled ? '<span class="form-hint">Plano cancelado neste dispositivo.</span>' : `<button class="button button-outline button-small" type="button" data-action="cancel-booking" data-id="${escapeHtml(booking.id)}">Cancelar reserva</button>`}</div></article>`;
  }).join('') : `<div class="empty-state"><div class="empty-icon">${icon('calendar')}</div><h2 class="empty-title">O próximo encontro começa aqui.</h2><p class="empty-copy">Ainda não tens reservas neste dispositivo. Descobre um restaurante e experimenta o teu primeiro plano.</p><a class="button button-dark" href="#explorar">Encontrar uma mesa ${icon('arrowRight')}</a></div>`}</section>`;
}

export function partnersView({ profile } = {}) {
  return `<section class="container partner-hero"><div class="partners-copy"><p class="section-kicker">PARA QUEM RECEBE À MESA</p><h1 class="page-title">O teu restaurante.<br>Novas boas histórias.</h1><p class="page-intro">Queremos aproximar quem gosta de comer bem dos lugares que merecem ser descobertos.</p><button class="button button-primary" type="button" data-action="partner-signup">Quero fazer parte ${icon('arrowRight')}</button><p class="form-hint">Experimenta o pedido de adesão em modo de demonstração.</p></div><img class="hero-photo" src="/images/restaurant-2.png" alt="Um restaurante acolhedor à espera de novos clientes" width="600" height="640"></section>
  <section class="section container"><div class="section-heading"><div><p class="section-kicker">MAIS LUGAR PARA O TEU NEGÓCIO</p><h2 class="section-title">Tu cuidas da experiência.<br>Nós ajudamos no encontro.</h2></div></div><div class="partner-benefits"><article class="partner-benefit"><span class="step-icon">${icon('users')}</span><h3 class="step-title">Chega a novas pessoas.</h3><p class="step-copy">Mostra o teu espaço a quem procura uma experiência que combina com a tua cozinha.</p></article><article class="partner-benefit"><span class="step-icon">${icon('calendar')}</span><h3 class="step-title">Planos mais organizados.</h3><p class="step-copy">Uma visão simples das reservas e dos detalhes de cada grupo. A gestão real chegará numa próxima fase.</p></article><article class="partner-benefit"><span class="step-icon">${icon('heart')}</span><h3 class="step-title">A tua identidade primeiro.</h3><p class="step-copy">Os teus sabores, o teu ambiente e as pequenas coisas que fazem querer voltar.</p></article></div></section>`;
}

export function bookingFormView({ restaurant, defaults = {}, surprise = false, error = '' } = {}) {
  if (!restaurant) return `<h2 class="modal-title" id="modal-title">Esta mesa já não está disponível.</h2><p class="modal-intro">Experimenta escolher outro restaurante.</p>`;
  const guests = Number(defaults.guests) || 2;
  return `<p class="modal-eyebrow">${surprise ? 'A TUA SURPRESA ESTÁ NA MESA' : 'UM BOM MOMENTO COMEÇA AQUI'}</p><h2 class="modal-title" id="modal-title">${surprise ? 'A nossa escolha para ti.' : 'Vamos guardar esta mesa?'}</h2>
  <div class="surprise-reveal"><img class="reveal-image" src="${escapeHtml(restaurant.image)}" alt="Ambiente ilustrativo de ${escapeHtml(restaurant.name)}" width="180" height="140"><div class="reveal-details"><p class="card-location">${escapeHtml(restaurant.cuisine)} · ${escapeHtml(restaurant.city)}</p><h3>${escapeHtml(restaurant.name)}</h3><p>${escapeHtml(restaurant.neighborhood)} · ${escapeHtml(money(restaurant.price))} / pessoa</p></div></div>
  <p class="modal-intro">${escapeHtml(restaurant.description)}</p><div class="inline-notice">Esta é uma reserva de demonstração. Não é enviada ao restaurante.</div>
  <form id="booking-form"><input type="hidden" name="restaurantId" value="${escapeHtml(restaurant.id)}"><input type="hidden" name="surprise" value="${Boolean(surprise)}"><div class="form-grid">
    <div class="form-field"><label for="booking-name">O teu nome</label><input id="booking-name" name="name" autocomplete="name" required minlength="2" maxlength="100" placeholder="Como te chamas?" value="${escapeHtml(defaults.name)}"></div>
    <div class="form-field"><label for="booking-email">Email</label><input id="booking-email" name="email" type="email" autocomplete="email" required maxlength="254" placeholder="ola@exemplo.pt" value="${escapeHtml(defaults.email)}"></div>
    <div class="form-field"><label for="booking-date">Dia</label><input id="booking-date" name="date" type="date" min="${escapeHtml(defaults.minDate || dateToday())}" value="${escapeHtml(defaults.date)}" required></div>
    <div class="form-field"><label for="booking-time">Hora</label><select id="booking-time" name="time" required>${options(restaurant.times || [], defaults.time || restaurant.times?.[0])}</select></div>
    <div class="form-field full-width"><label for="booking-guests">Pessoas à mesa</label><select id="booking-guests" name="guests">${Array.from({ length: 8 }, (_, i) => `<option value="${i + 1}"${selected(i + 1, guests)}>${i + 1} ${i === 0 ? 'pessoa' : 'pessoas'}</option>`).join('')}</select></div>
    <div class="form-field full-width"><label class="consent-label"><input type="checkbox" name="consent" required> <span>Compreendo que esta reserva é de demonstração.</span></label></div>
  </div>${error ? `<p class="form-error" role="alert">${escapeHtml(error)}</p>` : ''}<button class="button button-primary button-wide" type="submit">Confirmar reserva de demonstração ${icon('arrowRight')}</button><p class="form-hint">Os teus dados ficam apenas neste dispositivo.</p></form>`;
}

export function confirmationView({ booking, restaurant } = {}) {
  return `<div class="success-mark">${icon('check')}</div><p class="modal-eyebrow">UM PLANO A MENOS PARA DECIDIR</p><h2 class="modal-title" id="modal-title">O teu plano ficou guardado.</h2><p class="modal-intro">${escapeHtml(booking.name)}, já podes encontrar este plano nas tuas reservas de demonstração.</p><p class="booking-reference">${escapeHtml(booking.reference)}</p><div class="form-summary"><div class="summary-row"><span>Restaurante</span><strong>${escapeHtml(restaurant.name)}</strong></div><div class="summary-row"><span>Localização</span><strong>${escapeHtml(restaurant.city)}</strong></div><div class="summary-row"><span>Quando</span><strong>${escapeHtml(formatDate(booking.date))} · ${escapeHtml(booking.time)}</strong></div><div class="summary-row"><span>À mesa</span><strong>${escapeHtml(booking.guests)} ${booking.guests === 1 ? 'pessoa' : 'pessoas'}</strong></div></div><div class="inline-notice">Demonstração: esta reserva não foi enviada ao restaurante. Não foi enviado qualquer email.</div><button class="button button-dark button-wide" type="button" data-action="view-bookings">Ver as minhas reservas ${icon('arrowRight')}</button>`;
}

export function loginFormView({ profile, error = '' } = {}) {
  return `<p class="modal-eyebrow">BOM TER-TE POR AQUI</p><h2 class="modal-title" id="modal-title">${profile ? 'O teu perfil.' : 'Vamos tratar-te pelo nome?'}</h2><p class="modal-intro">Guarda os teus dados neste dispositivo para preencher as próximas reservas mais depressa.</p><div class="inline-notice">Este é um perfil local de demonstração. Não é uma conta autenticada.</div><form id="profile-form"><div class="form-grid"><div class="form-field full-width"><label for="profile-name">Nome</label><input id="profile-name" name="name" autocomplete="name" required minlength="2" maxlength="100" value="${escapeHtml(profile?.name)}" placeholder="O teu nome"></div><div class="form-field full-width"><label for="profile-email">Email</label><input id="profile-email" name="email" type="email" autocomplete="email" required maxlength="254" value="${escapeHtml(profile?.email)}" placeholder="ola@exemplo.pt"></div></div>${error ? `<p class="form-error" role="alert">${escapeHtml(error)}</p>` : ''}<button class="button button-dark button-wide" type="submit">Guardar perfil ${icon('arrowRight')}</button></form>`;
}

export function partnerFormView({ error = '', defaults = {} } = {}) {
  return `<p class="modal-eyebrow">VAMOS CONHECER O TEU ESPAÇO</p><h2 class="modal-title" id="modal-title">Há lugar para o teu restaurante.</h2><p class="modal-intro">Experimenta o pedido de adesão. Nesta fase os dados ficam apenas neste dispositivo e não são enviados.</p><form id="partner-form"><div class="form-grid"><div class="form-field full-width"><label for="partner-restaurant">Nome do restaurante</label><input id="partner-restaurant" name="restaurantName" required minlength="2" maxlength="120" placeholder="O nome do teu espaço" value="${escapeHtml(defaults.restaurantName)}"></div><div class="form-field"><label for="partner-name">O teu nome</label><input id="partner-name" name="name" autocomplete="name" required minlength="2" maxlength="100" value="${escapeHtml(defaults.name)}"></div><div class="form-field"><label for="partner-email">Email de contacto</label><input id="partner-email" name="email" type="email" autocomplete="email" required maxlength="254" value="${escapeHtml(defaults.email)}"></div><div class="form-field"><label for="partner-city">Cidade</label><select id="partner-city" name="city">${options(cities, defaults.city || 'Lisboa')}</select></div><div class="form-field"><label for="partner-cuisine">Tipo de cozinha</label><select id="partner-cuisine" name="cuisine">${options([...cuisines, 'Outra'], defaults.cuisine || 'Portuguesa')}</select></div><div class="form-field full-width"><label class="consent-label"><input type="checkbox" name="consent" required${Boolean(defaults.consent) ? ' checked' : ''}><span>Compreendo que este pedido é de demonstração e fica neste dispositivo.</span></label></div></div>${error ? `<p class="form-error" role="alert">${escapeHtml(error)}</p>` : ''}<button class="button button-primary button-wide" type="submit">Guardar pedido de demonstração ${icon('arrowRight')}</button></form>`;
}

export function partnerSuccessView({ persisted = true } = {}) {
  return `<div class="success-mark">${icon('check')}</div><p class="modal-eyebrow">UM PRIMEIRO PASSO À MESA</p><h2 class="modal-title" id="modal-title">${persisted ? 'O teu pedido ficou guardado.' : 'O teu pedido ficou preparado.'}</h2><p class="modal-intro">Obrigado por experimentares a adesão à plataforma «Marcas Tu?».</p><div class="inline-notice">${persisted ? 'Este pedido de demonstração foi guardado neste dispositivo. Não foi enviado, e não haverá contacto automático.' : 'Não foi possível guardar neste dispositivo. O pedido existe apenas nesta janela e não foi enviado.'}</div><button class="button button-dark button-wide" type="button" data-action="close-modal">Continuar a explorar ${icon('arrowRight')}</button>`;
}
