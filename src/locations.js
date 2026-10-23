import dataset from './locations-data.json' with { type: 'json' };

const collator = new Intl.Collator('pt-PT', { sensitivity: 'base', numeric: true });
const normalize = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .toLocaleLowerCase('pt-PT')
  .trim()
  .replace(/\s+/g, ' ');

const districtByCode = new Map(dataset.districts.map(([code, name, region]) => [code, { name, region }]));
const municipalityByCode = new Map(dataset.municipalities);

const municipalities = dataset.municipalities.map(([code, name]) => {
  const { name: district, region } = districtByCode.get(code.slice(0, 2));
  return { id: `municipality:${code}`, name, label: name, type: 'municipality', municipality: name, district, region };
});

const localities = dataset.localities.map(([municipalityCode, postalCode, name]) => {
  const municipality = municipalityByCode.get(municipalityCode);
  const { name: district, region } = districtByCode.get(municipalityCode.slice(0, 2));
  return {
    id: `locality:${municipalityCode}:${postalCode}`,
    name,
    label: `${name}, ${municipality}`,
    type: 'locality',
    municipality,
    district,
    region,
  };
});

// The CTT source also groups the eleven islands in its district column.
// They remain geographic metadata, rather than being presented as districts.
const districts = dataset.districts
  .filter(([code]) => Number(code) >= 1 && Number(code) <= 18)
  .map(([code, name, region]) => ({
    id: `district:${code}`, name, label: `${name} (distrito)`, type: 'district',
    municipality: null, district: name, region,
  }));

export const locations = Object.freeze([...municipalities, ...localities, ...districts]
  .map((location) => Object.freeze(location)));

const byId = new Map(locations.map((location) => [location.id, location]));
const byLabel = new Map(locations.map((location) => [normalize(location.label), location]));
const byName = new Map();
const typeRank = { municipality: 0, locality: 1, district: 2 };

const index = locations.map((location) => {
  const name = normalize(location.name);
  if (!byName.has(name)) byName.set(name, []);
  byName.get(name).push(location);
  return {
    location,
    name,
    label: normalize(location.label),
    searchable: normalize([location.name, location.municipality, location.district, location.region].filter(Boolean).join(' ')),
  };
});

// Initial suggestions reference real dataset entries; they do not claim a
// population or popularity ranking, neither of which is in the source data.
const initialNames = [
  'Lisboa', 'Porto', 'Cascais', 'Braga', 'Coimbra', 'Faro', 'Funchal', 'Ponta Delgada',
  'Vila Nova de Gaia', 'Aveiro', 'Évora', 'Guimarães', 'Setúbal', 'Viseu', 'Porto Santo', 'Vila do Porto',
];
const initial = initialNames.map((name) => municipalities.find((item) => item.name === name)).filter(Boolean);
const initialIds = new Set(initial.map((item) => item.id));
const alphabetical = [...locations].sort((left, right) => typeRank[left.type] - typeRank[right.type]
  || collator.compare(left.label, right.label));
const alphabeticalOrder = new Map(alphabetical.map((location, order) => [location.id, order]));
const emptySuggestions = [...initial, ...alphabetical.filter((item) => !initialIds.has(item.id))];

export function getLocationById(id) {
  return byId.get(String(id ?? '').trim()) ?? null;
}

export function findExactLocation(label) {
  const query = normalize(label);
  if (!query) return null;
  const idMatch = byId.get(query);
  if (idMatch) return idMatch;
  // Municipality labels are canonical names, so Lisbon/Porto/Cascais keep
  // selecting their municipality even when other municipalities have a
  // locality with the same name.
  const canonical = byLabel.get(query);
  if (canonical) return canonical;
  const matches = byName.get(query) ?? [];
  return matches.length === 1 ? matches[0] : null;
}

export function searchLocations(query, { limit = 8 } = {}) {
  const requested = Number(limit);
  const maximum = Number.isFinite(requested) ? Math.max(0, Math.trunc(requested)) : 8;
  if (!maximum) return [];
  const normalized = normalize(query);
  if (!normalized) return emptySuggestions.slice(0, maximum);
  const idMatch = byId.get(normalized);
  if (idMatch) return [idMatch];

  const tokens = normalized.split(/[\s,]+/u).filter(Boolean);
  const matches = [];
  for (const entry of index) {
    let rank;
    if (entry.label === normalized || entry.name === normalized) rank = 0;
    else if (entry.name.startsWith(normalized)) rank = 10;
    else if (entry.name.includes(` ${normalized}`) || entry.name.includes(`-${normalized}`)) rank = 20;
    else if (entry.name.includes(normalized)) rank = 25;
    else if (tokens.every((token) => entry.name.includes(token))) rank = 30;
    else if (tokens.every((token) => entry.searchable.includes(token))) rank = 40;
    else continue;
    matches.push({ entry, rank });
  }
  matches.sort((left, right) => left.rank - right.rank
    || alphabeticalOrder.get(left.entry.location.id) - alphabeticalOrder.get(right.entry.location.id));
  return matches.slice(0, maximum).map(({ entry }) => entry.location);
}
