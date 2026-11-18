'use strict';

const storageKey = 'wehart-natal-cart-v1';
const byId = new Map(PRODUCTS.map(product => [product.id, product]));
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const money = cents => currency.format(cents / 100);
const quantity = count => count + (count === 1 ? ' modelo' : ' modelos');
const find = id => document.getElementById(id);
const cart = find('cart');
const grid = find('product-grid');
const detail = find('detail-view');
const checkout = find('checkout');
const closeCart = find('close-cart');
const openCart = find('open-cart');
const floatingCart = find('floating-cart');

function parseCart(value) {
  try {
    const ids = JSON.parse(value);
    return new Set(Array.isArray(ids) ? ids.filter(id => byId.has(id)) : []);
  } catch {
    return new Set();
  }
}

function readCart() {
  try {
    return parseCart(localStorage.getItem(storageKey));
  } catch {
    return new Set();
  }
}

let selected = readCart();

function quote(count) {
  if (count < PRICING.minimum) return null;
  if (count === PRODUCTS.length) {
    return { label: 'Coleção Completa', total: PRICING.collection, capped: false };
  }
  const subtotal = PRICING.base + (count - PRICING.minimum) * PRICING.additional;
  return {
    label: 'Pacote Personalizado',
    total: Math.min(subtotal, PRICING.collection),
    capped: subtotal >= PRICING.collection,
  };
}

function commitCart(message) {
  try {
    localStorage.setItem(storageKey, JSON.stringify([...selected]));
  } catch {
    message += ' O navegador não pôde salvar o carrinho para outra visita.';
  }
  updateCart();
  find('announcement').textContent = message;
}

function addProduct(id) {
  if (selected.has(id)) return;
  selected.add(id);
  commitCart(byId.get(id).title + ' adicionado ao carrinho.');
}

function removeProduct(id) {
  selected.delete(id);
  commitCart(byId.get(id).title + ' removido do carrinho.');
}

function updateCart() {
  const count = selected.size;
  const missing = Math.max(0, PRICING.minimum - count);
  const price = quote(count);
  find('cart-count').textContent = count;
  const cartLabel = 'Carrinho, ' + quantity(count) + ' selecionado' + (count === 1 ? '' : 's');
  openCart.setAttribute('aria-label', cartLabel);
  floatingCart.setAttribute('aria-label', 'Abrir ' + cartLabel.toLowerCase());
  find('floating-count').textContent = count;
  floatingCart.hidden = count === 0;
  find('drawer-count').textContent = quantity(count) + (count === 1 ? ' selecionado' : ' selecionados');

  for (const button of grid.querySelectorAll('[data-add]')) {
    const exists = selected.has(button.dataset.add);
    button.textContent = exists ? '✓ Selecionado' : '+ Adicionar ao carrinho';
    button.classList.toggle('selected', exists);
    button.setAttribute('aria-disabled', String(exists));
  }

  const detailAction = detail.querySelector('[data-toggle]');
  if (detailAction) {
    const exists = selected.has(detailAction.dataset.toggle);
    detailAction.textContent = exists ? 'Remover do carrinho' : 'Adicionar ao carrinho';
    detailAction.classList.toggle('outline', exists);
    detailAction.classList.toggle('primary', !exists);
  }

  const progress = find('cart-progress');
  progress.max = PRICING.minimum;
  progress.value = Math.min(count, PRICING.minimum);
  find('cart-progress-text').textContent = missing === 0
    ? 'Seu pacote está pronto! Você já pode finalizar seu pedido.'
    : missing === 1
      ? 'Falta apenas 1 modelo para completar seu pacote!'
      : 'Você selecionou ' + quantity(count) + '. Escolha mais ' + missing + ' para completar o mínimo de ' + quantity(PRICING.minimum) + '.';

  find('cart-items').innerHTML = PRODUCTS.filter(product => selected.has(product.id)).map(product => `
    <li>
      <img src="${product.media}/capa.webp" alt="" width="52" height="52">
      <div><p>${product.title}</p><small>Arquivo digital STL</small></div>
      <button class="button outline close" type="button" data-remove="${product.id}" aria-label="Remover ${product.title}">×</button>
    </li>`).join('');

  find('cart-package').textContent = price?.label ?? 'Pacote Personalizado · mínimo de ' + quantity(PRICING.minimum);
  find('cart-total').textContent = price ? money(price.total) : '—';
  const note = find('cart-price-note');
  note.hidden = !price?.capped;
  note.textContent = price?.capped ? 'Seu pacote atingiu o preço da coleção. Você pode selecionar os 13 modelos pelo mesmo valor.' : '';
  checkout.disabled = !price;
}

function renderCatalog() {
  const savings = PRODUCTS.length * PRICING.reference - PRICING.collection;
  const discount = Math.round(100 * savings / (PRODUCTS.length * PRICING.reference));
  find('custom-price').textContent = money(PRICING.base);
  find('custom-terms').textContent = quantity(PRICING.minimum) + ' à escolha · ' + money(PRICING.additional) + ' por modelo adicional';
  find('full-price').textContent = money(PRICING.collection);
  find('full-terms').textContent = quantity(PRODUCTS.length) + ' · ' + discount + '% de economia sobre a referência de ' + money(PRICING.reference) + ' por modelo';
  find('model-count').textContent = quantity(PRODUCTS.length);
  grid.innerHTML = PRODUCTS.map((product, index) => `
    <article class="card">
      <a class="card-photo" href="#modelo/${product.id}" aria-label="Ver ${product.title}">
        <img src="${product.media}/capa.webp" alt="${product.photos[0]}" loading="${index < 3 ? 'eager' : 'lazy'}" decoding="async">
      </a>
      <div class="card-content">
        <p class="eyebrow">${product.type}</p>
        <h3>${product.title}</h3>
        <a class="details-link" href="#modelo/${product.id}">Ver vídeo e detalhes <span aria-hidden="true">↗</span></a>
        <button class="button outline" type="button" data-add="${product.id}">+ Adicionar ao carrinho</button>
      </div>
    </article>`).join('');
}

function renderDetail(product) {
  detail.innerHTML = `
    <a class="back details-link" href="#modelos"><span aria-hidden="true">←</span> Voltar ao catálogo</a>
    <div class="detail-layout">
      <section class="gallery" aria-label="Galeria de ${product.title}">
        <figure class="main-photo">
          <img id="active-photo" src="${product.media}/foto-1.webp" alt="${product.photos[0]}">
        </figure>
        ${product.photos.length > 1 ? `<div class="thumbs" role="group" aria-label="Fotos do produto">
          ${product.photos.map((alt, index) => `<button type="button" data-photo="${index}" aria-label="${alt}" aria-pressed="${index === 0}">
            <img src="${product.media}/foto-${index + 1}.webp" alt="">
          </button>`).join('')}
        </div>` : ''}
      </section>
      <div class="detail-copy">
        <p class="eyebrow">${product.type}</p>
        <h1 id="detail-title" tabindex="-1">${product.title}</h1>
        <p class="description">${product.description}</p>
        <p class="digital">Produto digital · Formato STL · Para fatiamento e impressão 3D</p>
        <div class="detail-actions">
          <button type="button" class="button primary" data-toggle="${product.id}">Adicionar ao carrinho</button>
          <a class="button outline" href="#modelos">Voltar ao catálogo</a>
        </div>
        <section class="video-block" aria-labelledby="video-title">
          <h2 id="video-title">Vídeo demonstrativo</h2>
          <video src="${product.media}/demo.mp4" poster="${product.media}/capa.webp" controls muted playsinline preload="none" aria-label="Vídeo de ${product.title}"></video>
        </section>
      </div>
    </div>`;
}

function renderRoute(moveFocus = true) {
  const hash = location.hash;
  const product = hash.startsWith('#modelo/') ? byId.get(hash.slice(8)) : undefined;
  find('catalog-view').hidden = Boolean(product);
  detail.hidden = !product;
  document.title = product
    ? product.title + ' | WehART modelagem 3D'
    : 'WehART modelagem 3D | Coleção de Natal — Arquivos STL';
  if (product) {
    renderDetail(product);
    window.scrollTo(0, 0);
    if (moveFocus) find('detail-title').focus({ preventScroll: true });
  } else {
    detail.replaceChildren();
    if (hash === '#modelos' || hash === '#conteudo') {
      const section = find(hash.slice(1));
      section.scrollIntoView();
      if (moveFocus) (hash === '#modelos' ? find('models-title') : section).focus({ preventScroll: true });
    } else if (moveFocus) {
      window.scrollTo(0, 0);
      find('hero-title').focus({ preventScroll: true });
    }
  }
  updateCart();
}

function showCart() {
  if (!cart.open) cart.showModal();
}

grid.addEventListener('click', event => {
  const button = event.target.closest('[data-add]');
  if (button) addProduct(button.dataset.add);
});

detail.addEventListener('click', event => {
  const toggle = event.target.closest('[data-toggle]');
  if (toggle) {
    const id = toggle.dataset.toggle;
    if (selected.has(id)) removeProduct(id);
    else addProduct(id);
    return;
  }
  const thumbnail = event.target.closest('[data-photo]');
  if (!thumbnail) return;
  const product = byId.get(detail.querySelector('[data-toggle]').dataset.toggle);
  const index = Number(thumbnail.dataset.photo);
  const photo = find('active-photo');
  photo.src = product.media + '/foto-' + (index + 1) + '.webp';
  photo.alt = product.photos[index];
  for (const button of detail.querySelectorAll('[data-photo]')) {
    button.setAttribute('aria-pressed', String(button === thumbnail));
  }
});

openCart.addEventListener('click', showCart);
floatingCart.addEventListener('click', showCart);
closeCart.addEventListener('click', () => cart.close());
cart.addEventListener('click', event => {
  if (event.target === cart && event.clientX < cart.getBoundingClientRect().left) cart.close();
});

find('cart-items').addEventListener('click', event => {
  const button = event.target.closest('[data-remove]');
  if (!button) return;
  const next = button.closest('li').nextElementSibling?.querySelector('button')
    ?? button.closest('li').previousElementSibling?.querySelector('button');
  const nextId = next?.dataset.remove;
  removeProduct(button.dataset.remove);
  const nextButton = find('cart-items').querySelector('[data-remove="' + nextId + '"]');
  (nextButton ?? closeCart).focus();
});

find('select-all').addEventListener('click', () => {
  selected = new Set(byId.keys());
  commitCart('Coleção Completa selecionada.');
  showCart();
});

checkout.addEventListener('click', () => {
  const products = PRODUCTS.filter(product => selected.has(product.id));
  const price = quote(products.length);
  if (!price) return;
  const selection = products.length === PRODUCTS.length
    ? ['Olá! Quero o pacote completo dos STLs da coleção de Natal da WehART modelagem 3D.']
    : [
      'Olá! Escolhi estes modelos 3D de Natal no catálogo WehART modelagem 3D:',
      '',
      ...products.map((product, index) => (index + 1) + '. ' + product.title),
    ];
  const message = [
    ...selection,
    '',
    'Quantidade: ' + quantity(products.length),
    'Pacote: ' + price.label,
    'Valor total: ' + money(price.total),
    '',
    'Gostaria de finalizar meu pedido!',
  ].join('\n');
  window.open('https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message), '_blank', 'noopener,noreferrer');
});

window.addEventListener('hashchange', () => renderRoute());
window.addEventListener('storage', event => {
  if (event.storageArea !== localStorage || (event.key !== storageKey && event.key !== null)) return;
  selected = parseCart(event.newValue);
  updateCart();
});
renderCatalog();
renderRoute(false);
