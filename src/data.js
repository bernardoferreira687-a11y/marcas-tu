// Todos os espaços e avaliações são fictícios e destinam-se à demonstração.
export const cities = ['Lisboa', 'Porto', 'Cascais'];

export const restaurants = [
  {
    id: 'casa-do-largo',
    name: 'Casa do Largo',
    city: 'Lisboa',
    neighborhood: 'Príncipe Real',
    cuisine: 'Portuguesa',
    price: 28,
    rating: 4.8,
    reviews: 124,
    image: '/images/restaurant-1.png',
    description: 'Sabores de cá, uma mesa demorada e a luz bonita de um pátio lisboeta.',
    tags: ['Pátio escondido', 'Para partilhar'],
    times: ['19:00', '19:30', '20:00', '20:30', '21:00'],
    address: 'Rua do Pátio Sereno, 12 · Príncipe Real, Lisboa',
  },
  {
    id: 'olio-lisboa',
    name: 'Olio',
    city: 'Lisboa',
    neighborhood: 'Chiado',
    cuisine: 'Italiana',
    price: 32,
    rating: 4.9,
    reviews: 98,
    image: '/images/restaurant-2.png',
    description: 'Massa fresca, vinho a copo e aquela vontade de ficar só mais um bocadinho.',
    tags: ['Encontro a dois', 'Massa fresca'],
    times: ['18:30', '19:00', '19:30', '20:00', '20:30', '21:00'],
    address: 'Travessa da Mesa Nova, 8 · Chiado, Lisboa',
  },
  {
    id: 'verde-e-sal',
    name: 'Verde & Sal',
    city: 'Lisboa',
    neighborhood: 'Campo de Ourique',
    cuisine: 'Mediterrânica',
    price: 24,
    rating: 4.7,
    reviews: 87,
    image: '/images/restaurant-1.png',
    description: 'Produtos da estação, pratos cheios de cor e uma esplanada de bairro.',
    tags: ['Opções vegetarianas', 'Descontraído'],
    times: ['12:30', '13:00', '13:30', '19:00', '19:30', '20:00'],
    address: 'Rua das Ervas, 21 · Campo de Ourique, Lisboa',
  },
  {
    id: 'nami',
    name: 'Nami',
    city: 'Lisboa',
    neighborhood: 'Santos',
    cuisine: 'Japonesa',
    price: 38,
    rating: 4.9,
    reviews: 146,
    image: '/images/restaurant-2.png',
    description: 'Um balcão acolhedor, peixe do dia e pequenos pratos para uma noite especial.',
    tags: ['Ocasião especial', 'Ao balcão'],
    times: ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30'],
    address: 'Rua do Cais Pequeno, 5 · Santos, Lisboa',
  },
  {
    id: 'a-mesa-do-douro',
    name: 'À Mesa do Douro',
    city: 'Porto',
    neighborhood: 'Ribeira',
    cuisine: 'Portuguesa',
    price: 30,
    rating: 4.8,
    reviews: 112,
    image: '/images/restaurant-1.png',
    description: 'Receitas com memória e uma seleção de vinhos para descobrir sem pressa.',
    tags: ['Boa garrafeira', 'Cozinha de conforto'],
    times: ['12:30', '13:00', '19:00', '19:30', '20:00', '20:30'],
    address: 'Largo do Barco, 7 · Ribeira, Porto',
  },
  {
    id: 'forno-da-rua',
    name: 'Forno da Rua',
    city: 'Porto',
    neighborhood: 'Cedofeita',
    cuisine: 'Italiana',
    price: 22,
    rating: 4.7,
    reviews: 73,
    image: '/images/restaurant-2.png',
    description: 'Pizzas do forno, mesas corridas e conversas que começam com um brinde.',
    tags: ['Entre amigos', 'Forno a lenha'],
    times: ['12:30', '13:00', '19:00', '19:30', '20:00', '20:30', '21:00'],
    address: 'Rua do Alecrim Novo, 34 · Cedofeita, Porto',
  },
  {
    id: 'sal-e-brisa',
    name: 'Sal & Brisa',
    city: 'Cascais',
    neighborhood: 'Centro',
    cuisine: 'Mediterrânica',
    price: 34,
    rating: 4.8,
    reviews: 105,
    image: '/images/restaurant-1.png',
    description: 'O sabor do mar, legumes da horta e almoços que pedem uma tarde livre.',
    tags: ['Perto do mar', 'Esplanada'],
    times: ['12:30', '13:00', '13:30', '19:00', '19:30', '20:00', '20:30'],
    address: 'Travessa da Brisa, 3 · Centro, Cascais',
  },
  {
    id: 'casa-das-laranjeiras',
    name: 'Casa das Laranjeiras',
    city: 'Cascais',
    neighborhood: 'Monte Estoril',
    cuisine: 'Portuguesa',
    price: 26,
    rating: 4.6,
    reviews: 64,
    image: '/images/restaurant-2.png',
    description: 'Uma casa luminosa, pratos para dividir e um jardim que convida a ficar.',
    tags: ['Jardim', 'Em família'],
    times: ['12:00', '12:30', '13:00', '19:00', '19:30', '20:00'],
    address: 'Rua do Jardim Manso, 18 · Monte Estoril, Cascais',
  },
];

const normalize = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-PT')
  .trim();

// The demo's restaurants have municipality and neighborhood information,
// but no coordinates: only match locations their existing details support.
const demoDistricts = { Lisboa: 'Lisboa', Porto: 'Porto', Cascais: 'Lisboa' };

function matchesLocation(restaurant, location) {
  if (!location || typeof location !== 'object') return false;
  if (location.type === 'district') {
    return normalize(demoDistricts[restaurant.city]) === normalize(location.name);
  }
  const municipality = normalize(location.municipality || location.name);
  if (normalize(restaurant.city) !== municipality) return false;
  if (location.type === 'municipality') return true;
  if (location.type === 'locality') {
    return [restaurant.city, restaurant.neighborhood].some((name) => normalize(name) === normalize(location.name));
  }
  return false;
}

export function filterRestaurants(filters = {}) {
  const city = normalize(filters.city);
  const cuisine = normalize(filters.cuisine);
  const query = normalize(filters.query);
  const budget = Number(filters.budget);

  return restaurants.filter((restaurant) => {
    if (filters.location && !matchesLocation(restaurant, filters.location)) return false;
    if (!filters.location && city && city !== 'todas' && city !== 'todas as cidades'
      && normalize(restaurant.city) !== city) return false;
    if (cuisine && cuisine !== 'todas' && cuisine !== 'todas as cozinhas'
      && normalize(restaurant.cuisine) !== cuisine) return false;
    if (Number.isFinite(budget) && budget > 0 && restaurant.price > budget) return false;
    if (query && !normalize(`${restaurant.name} ${restaurant.neighborhood} ${restaurant.cuisine} ${restaurant.city}`)
      .includes(query)) return false;
    return true;
  });
}

export function chooseRestaurant(filters = {}) {
  const matches = filterRestaurants(filters);
  return matches.length ? matches[Math.floor(Math.random() * matches.length)] : null;
}
