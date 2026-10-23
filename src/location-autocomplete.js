const normalizeLabel = (value) => String(value ?? '')
  .trim()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-PT');

/**
 * Mounts a local location picker. The searchable dataset is injected so this
 * component stays independent of its size and never requires network requests.
 */
export function mountLocationAutocomplete(root, { searchLocations, findExactLocation, onSelect } = {}) {
  const input = root.querySelector('[data-location-input]');
  const list = root.querySelector('[data-location-options]');
  const status = root.querySelector('[data-location-status]');
  const clearButton = root.querySelector('[data-location-clear]');
  if (!input || !list || !status || !clearButton) {
    throw new Error('O campo de localização precisa de input, opções, estado e botão de limpar.');
  }
  if (typeof searchLocations !== 'function' || typeof findExactLocation !== 'function') {
    throw new Error('O campo de localização precisa das funções de pesquisa e validação de localidades.');
  }

  const document = root.ownerDocument;
  const view = document.defaultView;
  const controller = new AbortController();
  const { signal } = controller;
  const listId = list.id || input.getAttribute('aria-controls') || 'home-city-options';
  if (!list.id) list.id = listId;
  input.setAttribute('aria-controls', listId);
  let matches = [];
  let activeIndex = -1;
  let destroyed = false;
  let selectedLocation = null;

  function getLocation() {
    const text = normalizeLabel(input.value);
    if (selectedLocation && text !== normalizeLabel(selectedLocation.label)) selectedLocation = null;
    const location = selectedLocation || findExactLocation(input.value) || null;
    input.setCustomValidity(location ? '' : 'Escolhe uma localidade da lista.');
    if (input.value.trim() && !location) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    return location;
  }

  function close() {
    list.hidden = true;
    list.classList.remove('is-above');
    list.style.removeProperty('max-height');
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    activeIndex = -1;
    for (const option of list.querySelectorAll('[role="option"]')) {
      option.classList.remove('active');
      option.setAttribute('aria-selected', 'false');
    }
  }

  function positionSuggestions() {
    if (destroyed || list.hidden) return;
    // Re-read the stylesheet cap after each viewport change rather than keeping
    // the previous small viewport's inline height when space becomes available.
    list.style.removeProperty('max-height');
    const mobile = view.matchMedia('(max-width: 600px)').matches;
    const gap = mobile ? 16 : 18;
    const viewportTop = view.visualViewport?.offsetTop || 0;
    const viewportHeight = view.visualViewport?.height || view.innerHeight;
    const viewportBottom = viewportTop + viewportHeight;
    const rect = root.getBoundingClientRect();
    const cssCap = Number.parseFloat(view.getComputedStyle(list).maxHeight)
      || (mobile ? 290 : 330);
    const desired = Math.min(list.scrollHeight, cssCap);
    const belowSpace = Math.max(0, viewportBottom - rect.bottom - gap - 8);
    const aboveSpace = Math.max(0, rect.top - viewportTop - gap - 8);
    const above = belowSpace < desired && aboveSpace > belowSpace;
    list.classList.toggle('is-above', above);
    const available = above ? aboveSpace : belowSpace;
    list.style.maxHeight = `${Math.max(0, Math.floor(Math.min(cssCap, available)))}px`;
  }

  function createPin() {
    const wrapper = document.createElement('span');
    wrapper.className = 'location-option-icon';
    wrapper.setAttribute('aria-hidden', 'true');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '18');
    svg.setAttribute('height', '18');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.6');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z');
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '10');
    circle.setAttribute('r', '2.5');
    svg.append(path, circle);
    wrapper.append(svg);
    return wrapper;
  }

  function updateActive(index) {
    activeIndex = matches.length ? ((index % matches.length) + matches.length) % matches.length : -1;
    const options = list.querySelectorAll('[role="option"]');
    options.forEach((option, optionIndex) => {
      const active = optionIndex === activeIndex;
      option.classList.toggle('active', active);
      option.setAttribute('aria-selected', String(active));
    });
    if (activeIndex < 0) input.removeAttribute('aria-activedescendant');
    else {
      const active = options[activeIndex];
      input.setAttribute('aria-activedescendant', active.id);
      active.scrollIntoView({ block: 'nearest' });
    }
  }

  function locationMeta(location) {
    if (location.type === 'municipality') {
      return ['Município', location.district || location.region].filter(Boolean).join(' · ');
    }
    if (location.type === 'district') {
      return ['Distrito', location.region || 'Portugal'].filter(Boolean).join(' · ');
    }
    return ['Localidade', location.municipality, location.district || location.region]
      .filter(Boolean).join(' · ');
  }

  function open({ allForCurrentLocation = false } = {}) {
    if (destroyed) return;
    const currentLocation = getLocation();
    const query = allForCurrentLocation && currentLocation ? '' : input.value.trim();
    const found = searchLocations(query, { limit: 8 });
    matches = Array.isArray(found) ? found : [];
    list.replaceChildren();
    activeIndex = -1;
    input.removeAttribute('aria-activedescendant');

    if (!matches.length) {
      const empty = document.createElement('div');
      empty.className = 'location-empty';
      empty.textContent = 'Não encontrámos localidades. Experimenta outra pesquisa.';
      list.append(empty);
      status.textContent = 'Nenhuma localidade encontrada.';
    } else {
      matches.forEach((location, index) => {
        const option = document.createElement('div');
        option.className = 'location-option';
        option.id = `${listId}-option-${index}`;
        option.dataset.locationIndex = String(index);
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', 'false');
        option.setAttribute('aria-label', location.label);
        option.tabIndex = -1;
        const text = document.createElement('span');
        text.className = 'location-option-text';
        const name = document.createElement('span');
        name.className = 'location-option-name';
        name.textContent = location.name || location.label;
        const meta = document.createElement('span');
        meta.className = 'location-option-meta';
        meta.textContent = locationMeta(location);
        text.append(name, meta);
        option.append(createPin(), text);
        list.append(option);
      });
      status.textContent = `${matches.length} ${matches.length === 1 ? 'localidade disponível' : 'localidades disponíveis'}. Usa as setas para escolher.`;
    }
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    positionSuggestions();
  }

  function select(location) {
    if (!location || destroyed) return;
    selectedLocation = location;
    input.value = location.label;
    getLocation();
    input.focus({ preventScroll: true });
    close();
    status.textContent = `${location.label} selecionada.`;
    if (typeof onSelect === 'function') onSelect(location);
  }

  input.addEventListener('focus', () => open({ allForCurrentLocation: true }), { signal });
  input.addEventListener('input', () => {
    selectedLocation = null;
    open();
  }, { signal });
  input.addEventListener('keydown', (event) => {
    if (event.isComposing) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (list.hidden) open({ allForCurrentLocation: true });
      const next = activeIndex < 0
        ? (event.key === 'ArrowDown' ? 0 : matches.length - 1)
        : activeIndex + (event.key === 'ArrowDown' ? 1 : -1);
      updateActive(next);
    } else if (event.key === 'Enter') {
      if (list.hidden && getLocation()) return;
      event.preventDefault();
      if (list.hidden) open();
      const exact = getLocation();
      const choice = activeIndex >= 0 ? matches[activeIndex] : (exact || (matches.length === 1 ? matches[0] : null));
      if (choice) select(choice);
    } else if (event.key === 'Escape') {
      if (!list.hidden) event.preventDefault();
      close();
    } else if (event.key === 'Tab') {
      close();
    }
  }, { signal });

  // Keep mouse focus on the input; touch remains free to pan the list naturally.
  list.addEventListener('pointerdown', (event) => {
    if (event.button === 0 && (!event.pointerType || event.pointerType === 'mouse')
      && event.target.closest?.('[data-location-index]')) event.preventDefault();
  }, { signal });
  list.addEventListener('click', (event) => {
    const option = event.target.closest?.('[data-location-index]');
    if (option && list.contains(option)) select(matches[Number(option.dataset.locationIndex)]);
  }, { signal });
  clearButton.addEventListener('pointerdown', (event) => {
    if (event.button === 0 && (!event.pointerType || event.pointerType === 'mouse')) event.preventDefault();
  }, { signal });
  clearButton.addEventListener('click', () => {
    selectedLocation = null;
    input.value = '';
    getLocation();
    input.focus({ preventScroll: true });
    open();
  }, { signal });
  root.addEventListener('focusout', (event) => {
    if (!root.contains(event.relatedTarget)) close();
  }, { signal });
  document.addEventListener('pointerdown', (event) => {
    if (!root.contains(event.target)) close();
  }, { signal });
  view.addEventListener('resize', positionSuggestions, { signal, passive: true });
  view.visualViewport?.addEventListener('resize', positionSuggestions, { signal, passive: true });
  view.visualViewport?.addEventListener('scroll', positionSuggestions, { signal, passive: true });
  document.addEventListener('scroll', (event) => {
    if (event.target === list || list.contains(event.target)) return;
    positionSuggestions();
  }, { signal, passive: true, capture: true });

  getLocation();
  close();

  return {
    getLocation,
    getCity: () => getLocation()?.label ?? null,
    close,
    destroy() {
      if (destroyed) return;
      close();
      destroyed = true;
      controller.abort();
    },
  };
}
