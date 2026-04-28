/* ============================================================
   FAKESTORE · app.js
   CRUD completo consumiendo https://fakestoreapi.com/
   Autor: Portfolio Project
   ============================================================

   ÍNDICE:
   1.  CONFIG & ESTADO
   2.  UTILIDADES (toast, loader, render de íconos)
   3.  READ   — fetchProducts, renderProducts, renderCard
   4.  CREATE — openAddModal, handleFormSubmit (POST)
   5.  UPDATE — openEditModal (GET by id), handleFormSubmit (PUT)
   6.  DELETE — openConfirmDialog, deleteProduct (DELETE)
   7.  BÚSQUEDA & FILTROS
   8.  CATEGORÍAS — fetchCategories, populateCategorySelects
   9.  VALIDACIÓN del formulario
   10. INICIALIZACIÓN — init()
   ============================================================ */

'use strict';

/* ============================================================
   1. CONFIG & ESTADO
   ============================================================ */

/** URL base de la API pública */
const API = 'https://fakestoreapi.com';

/**
 * Estado global de la aplicación.
 * Toda la lógica de filtrado y búsqueda opera sobre este array
 * para no tener que re-pedir a la API en cada interacción.
 */
const state = {
  products:  [],   // todos los productos cargados desde la API
  filtered:  [],   // subconjunto visible según búsqueda/filtros
  editingId: null, // ID del producto que se está editando (null = modo CREATE)
  deletingId:null, // ID del producto a eliminar
};

/* ============================================================
   2. UTILIDADES
   ============================================================ */

/**
 * Muestra un mensaje tipo toast en la esquina inferior derecha.
 * @param {string} message - Texto del mensaje
 * @param {'success'|'error'|'info'} type  - Tipo de toast
 * @param {number} duration - Milisegundos antes de auto-cerrar
 */
function showToast(message, type = 'success', duration = 3500) {
  const container = document.getElementById('toast-container');

  const iconMap = { success: 'check-circle', error: 'x-circle', info: 'info' };

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
         viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      ${getIconPath(iconMap[type])}
    </svg>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  // Auto-eliminar después de `duration` ms
  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

/**
 * Retorna el path SVG para un ícono simple inline (sin depender de Lucide en JS).
 * Solo los íconos usados en toasts.
 */
function getIconPath(name) {
  const paths = {
    'check-circle': '<polyline points="20 6 9 17 4 12"></polyline>',
    'x-circle':     '<line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>',
    'info':         '<line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>',
  };
  return paths[name] || '';
}

/**
 * Oculta el overlay de carga.
 */
function hideLoader() {
  document.getElementById('loader').classList.add('hidden');
}

/**
 * Formatea un número como precio en USD.
 * @param {number} price
 * @returns {string} Ej: "$99.99"
 */
function formatPrice(price) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
}

/**
 * Capitaliza la primera letra de un string.
 * @param {string} str
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ============================================================
   3. READ — Obtener y mostrar productos
   ============================================================ */

/**
 * Solicita todos los productos a la API (GET /products).
 * Almacena el resultado en state.products y llama a renderProducts().
 */
async function fetchProducts() {
  try {
    const res = await fetch(`${API}/products`);

    if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);

    const data = await res.json();
    state.products = data;
    state.filtered  = [...data]; // inicialmente se muestran todos

    renderProducts(state.filtered);
    hideLoader();

  } catch (err) {
    hideLoader();
    showToast(`No se pudo cargar los productos: ${err.message}`, 'error', 6000);
    console.error('[fetchProducts]', err);
  }
}

/**
 * Renderiza el array de productos en el grid del DOM.
 * Si el array está vacío, muestra el estado vacío.
 * @param {Array} products - Productos a mostrar
 */
function renderProducts(products) {
  const grid       = document.getElementById('products-grid');
  const emptyState = document.getElementById('empty-state');
  const countEl    = document.getElementById('product-count');

  // Actualizar contador
  countEl.textContent = `${products.length} producto${products.length !== 1 ? 's' : ''} encontrado${products.length !== 1 ? 's' : ''}`;

  if (products.length === 0) {
    grid.innerHTML = '';
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  // Generar HTML de cada card y volcarlo al grid
  grid.innerHTML = products.map(product => buildCardHTML(product)).join('');

  // Delegar eventos de editar/eliminar al grid (event delegation)
  // Los listeners ya están en initEventListeners(), solo necesitamos que los botones existan.

  // Re-inicializar los íconos de Lucide para los recién creados
  if (window.lucide) lucide.createIcons();
}

/**
 * Construye el HTML de una tarjeta de producto.
 * @param {Object} product - Objeto producto de la API
 * @returns {string} HTML de la card
 */
function buildCardHTML({ id, title, price, category, image, rating }) {
  const ratingVal = rating?.rate ?? '—';
  const imgSrc    = image || 'https://via.placeholder.com/300x300?text=Sin+imagen';

  return `
    <article class="product-card" data-id="${id}">
      <div class="product-card__img-wrap">
        <img
          class="product-card__img"
          src="${imgSrc}"
          alt="${title}"
          loading="lazy"
          onerror="this.src='https://via.placeholder.com/300x300?text=Sin+imagen'"
        />
        <span class="product-card__badge">${capitalize(category)}</span>
        <div class="product-card__rating">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          ${ratingVal}
        </div>
      </div>
      <div class="product-card__body">
        <h3 class="product-card__title">${title}</h3>
        <p class="product-card__price">
          ${formatPrice(price)} <span>USD</span>
        </p>
        <div class="product-card__actions">
          <button class="btn btn--edit js-edit" data-id="${id}" aria-label="Editar ${title}">
            <i data-lucide="pencil"></i> Editar
          </button>
          <button class="btn btn--delete js-delete" data-id="${id}" aria-label="Eliminar ${title}">
            <i data-lucide="trash-2"></i> Eliminar
          </button>
        </div>
      </div>
    </article>
  `;
}

/* ============================================================
   4. CREATE — Abrir modal vacío y enviar POST
   ============================================================ */

/**
 * Abre el modal en modo "Agregar producto".
 * Limpia el formulario y establece el modo CREATE (editingId = null).
 */
function openAddModal() {
  state.editingId = null;

  resetForm();
  document.getElementById('modal-title').textContent  = 'Agregar producto';
  document.getElementById('submit-label').textContent  = 'Guardar producto';
  document.getElementById('product-id').value = '';

  showModal('modal');
}

/* ============================================================
   5. UPDATE — Abrir modal con datos y enviar PUT
   ============================================================ */

/**
 * Abre el modal en modo "Editar" precargando los datos del producto.
 * Primero busca en state.products para evitar un extra request;
 * si no está (producto creado localmente), hace GET /products/:id.
 * @param {number|string} id - ID del producto a editar
 */
async function openEditModal(id) {
  state.editingId = Number(id);

  // Buscar primero en el estado local
  let product = state.products.find(p => p.id === state.editingId);

  // Si no está en el estado (caso raro), pedirlo a la API
  if (!product) {
    try {
      const res = await fetch(`${API}/products/${id}`);
      if (!res.ok) throw new Error('Producto no encontrado');
      product = await res.json();
    } catch (err) {
      showToast('No se pudo cargar el producto para editar.', 'error');
      return;
    }
  }

  // Pre-rellenar el formulario con los datos del producto
  resetForm();
  document.getElementById('modal-title').textContent       = 'Editar producto';
  document.getElementById('submit-label').textContent      = 'Actualizar producto';
  document.getElementById('product-id').value              = product.id;
  document.getElementById('product-title').value           = product.title;
  document.getElementById('product-price').value           = product.price;
  document.getElementById('product-description').value     = product.description;
  document.getElementById('product-image').value           = product.image || '';

  // Seleccionar la categoría correcta en el <select>
  const catSelect = document.getElementById('product-category');
  catSelect.value = product.category;

  showModal('modal');
}

/**
 * Manejador del submit del formulario.
 * Detecta si es CREATE (editingId === null) o UPDATE.
 * @param {Event} e
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  if (!validateForm()) return; // detener si hay errores de validación

  // Recopilar datos del formulario
  const payload = {
    title:       document.getElementById('product-title').value.trim(),
    price:       parseFloat(document.getElementById('product-price').value),
    description: document.getElementById('product-description').value.trim(),
    image:       document.getElementById('product-image').value.trim() ||
                 'https://fakestoreapi.com/img/placeholder.png',
    category:    document.getElementById('product-category').value,
  };

  const submitBtn = document.getElementById('form-submit');
  submitBtn.disabled = true;

  try {
    if (state.editingId === null) {
      // ── CREATE ── POST /products
      await createProduct(payload);
    } else {
      // ── UPDATE ── PUT /products/:id
      await updateProduct(state.editingId, payload);
    }
    closeModal('modal');
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
    console.error('[handleFormSubmit]', err);
  } finally {
    submitBtn.disabled = false;
  }
}

/**
 * Envía una solicitud POST para crear un nuevo producto.
 * FakeStore no persiste los datos reales, pero devuelve el objeto creado.
 * Actualizamos el estado local para reflejar el cambio en la UI.
 * @param {Object} payload
 */
async function createProduct(payload) {
  const res = await fetch(`${API}/products`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`POST falló: ${res.status}`);

  const newProduct = await res.json();

  // FakeStore devuelve id: 21 siempre. Usamos un ID local único para evitar colisiones.
  const tempId = Date.now();
  const productToAdd = { ...payload, id: tempId, rating: { rate: 0, count: 0 } };

  // Agregar al estado local y re-renderizar
  state.products.unshift(productToAdd);
  applyFilters();

  showToast(`"${payload.title}" agregado correctamente 🎉`, 'success');
}

/**
 * Envía una solicitud PUT para actualizar un producto existente.
 * Actualiza el estado local con los nuevos datos.
 * @param {number} id
 * @param {Object} payload
 */
async function updateProduct(id, payload) {
  const res = await fetch(`${API}/products/${id}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`PUT falló: ${res.status}`);

  // Actualizar el producto en el estado local
  const idx = state.products.findIndex(p => p.id === id);
  if (idx !== -1) {
    state.products[idx] = { ...state.products[idx], ...payload };
  }

  applyFilters(); // re-renderizar con los nuevos datos
  showToast(`Producto actualizado correctamente ✅`, 'success');
}

/* ============================================================
   6. DELETE — Confirmación y DELETE request
   ============================================================ */

/**
 * Abre el diálogo de confirmación antes de eliminar.
 * Guarda el ID en state.deletingId para usarlo al confirmar.
 * @param {number|string} id
 */
function openConfirmDialog(id) {
  state.deletingId = Number(id);
  showModal('confirm-dialog');
}

/**
 * Envía una solicitud DELETE para eliminar un producto.
 * Remueve el producto del estado local y re-renderiza.
 */
async function deleteProduct() {
  const id = state.deletingId;
  if (!id) return;

  const confirmBtn = document.getElementById('confirm-ok');
  confirmBtn.disabled = true;

  try {
    const res = await fetch(`${API}/products/${id}`, { method: 'DELETE' });

    if (!res.ok) throw new Error(`DELETE falló: ${res.status}`);

    // Remover del estado local
    state.products = state.products.filter(p => p.id !== id);
    applyFilters();

    closeModal('confirm-dialog');
    showToast('Producto eliminado.', 'info');

  } catch (err) {
    showToast(`No se pudo eliminar: ${err.message}`, 'error');
    console.error('[deleteProduct]', err);
  } finally {
    confirmBtn.disabled = false;
    state.deletingId = null;
  }
}

/* ============================================================
   7. BÚSQUEDA & FILTROS
   ============================================================ */

/**
 * Aplica simultáneamente el filtro de categoría, la búsqueda por texto
 * y el criterio de ordenamiento sobre state.products.
 * Actualiza state.filtered y llama a renderProducts().
 */
function applyFilters() {
  const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
  const category   = document.getElementById('filter-category').value;
  const sort       = document.getElementById('filter-sort').value;

  let result = [...state.products];

  // ── Filtro por categoría ──
  if (category && category !== 'all') {
    result = result.filter(p => p.category === category);
  }

  // ── Búsqueda por nombre ──
  if (searchTerm) {
    result = result.filter(p =>
      p.title.toLowerCase().includes(searchTerm) ||
      p.description?.toLowerCase().includes(searchTerm)
    );
  }

  // ── Ordenamiento ──
  switch (sort) {
    case 'price-asc':   result.sort((a, b) => a.price - b.price);                     break;
    case 'price-desc':  result.sort((a, b) => b.price - a.price);                     break;
    case 'name-asc':    result.sort((a, b) => a.title.localeCompare(b.title));         break;
    case 'rating-desc': result.sort((a, b) => (b.rating?.rate ?? 0) - (a.rating?.rate ?? 0)); break;
    default: break; // sin ordenamiento adicional
  }

  state.filtered = result;
  renderProducts(result);
}

/* ============================================================
   8. CATEGORÍAS
   ============================================================ */

/**
 * Obtiene las categorías disponibles desde la API (GET /products/categories)
 * y rellena los <select> de filtro y del formulario.
 */
async function fetchCategories() {
  try {
    const res = await fetch(`${API}/products/categories`);
    if (!res.ok) throw new Error('No se pudo obtener categorías');
    const categories = await res.json();
    populateCategorySelects(categories);
  } catch (err) {
    console.warn('[fetchCategories]', err);
    // Si falla, usamos categorías hardcoded como fallback
    populateCategorySelects(["electronics","jewelery","men's clothing","women's clothing"]);
  }
}

/**
 * Inyecta las opciones de categoría en los <select> del filtro y del formulario.
 * @param {string[]} categories
 */
function populateCategorySelects(categories) {
  const filterSelect = document.getElementById('filter-category');
  const formSelect   = document.getElementById('product-category');

  const optionsHTML = categories
    .map(cat => `<option value="${cat}">${capitalize(cat)}</option>`)
    .join('');

  // Para el filtro, la primera opción "Todas" ya existe en el HTML
  filterSelect.innerHTML = `<option value="all">Todas las categorías</option>${optionsHTML}`;

  // Para el formulario, la primera opción "Seleccionar…" ya existe en el HTML
  formSelect.innerHTML = `<option value="" disabled selected>Seleccionar…</option>${optionsHTML}`;
}

/* ============================================================
   9. VALIDACIÓN DEL FORMULARIO
   ============================================================ */

/**
 * Valida los campos obligatorios del formulario.
 * Muestra mensajes de error inline y hace foco en el primer campo inválido.
 * @returns {boolean} true si el formulario es válido
 */
function validateForm() {
  let isValid = true;

  // Definición de reglas
  const fields = [
    { id: 'product-title',       errorId: 'error-title',       rule: v => v.length >= 3,  msg: 'Mínimo 3 caracteres.' },
    { id: 'product-price',       errorId: 'error-price',       rule: v => Number(v) > 0,  msg: 'Debe ser mayor a 0.' },
    { id: 'product-description', errorId: 'error-description', rule: v => v.length >= 10, msg: 'Mínimo 10 caracteres.' },
    { id: 'product-category',    errorId: 'error-category',    rule: v => v !== '',       msg: 'Selecciona una categoría.' },
  ];

  let firstErrorField = null;

  fields.forEach(({ id, errorId, rule, msg }) => {
    const input    = document.getElementById(id);
    const errorEl  = document.getElementById(errorId);
    const group    = input.closest('.form-group');
    const value    = input.value.trim();

    if (!rule(value)) {
      isValid = false;
      errorEl.textContent = msg;
      group.classList.add('has-error');
      if (!firstErrorField) firstErrorField = input;
    } else {
      errorEl.textContent = '';
      group.classList.remove('has-error');
    }
  });

  if (firstErrorField) firstErrorField.focus();
  return isValid;
}

/**
 * Limpia los errores de validación del formulario.
 */
function clearValidationErrors() {
  document.querySelectorAll('.form-group.has-error').forEach(g => g.classList.remove('has-error'));
  document.querySelectorAll('.form-error').forEach(e => e.textContent = '');
}

/**
 * Limpia y resetea todos los campos del formulario.
 */
function resetForm() {
  document.getElementById('product-form').reset();
  clearValidationErrors();
}

/* ============================================================
   10. CONTROL DE MODALES
   ============================================================ */

/**
 * Muestra un modal (quita el atributo hidden y gestiona el scroll).
 * @param {string} modalId - ID del elemento modal
 */
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.hidden = false;
  document.body.style.overflow = 'hidden'; // evitar scroll del fondo
  // Re-inicializar íconos dentro del modal
  if (window.lucide) lucide.createIcons();
  // Focus al primer campo interactivo
  setTimeout(() => {
    const firstInput = modal.querySelector('input:not([type=hidden]), select, textarea, button');
    if (firstInput) firstInput.focus();
  }, 100);
}

/**
 * Oculta un modal y restaura el scroll.
 * @param {string} modalId - ID del elemento modal
 */
function closeModal(modalId) {
  document.getElementById(modalId).hidden = true;
  document.body.style.overflow = '';
}

/* ============================================================
   11. INICIALIZACIÓN & EVENT LISTENERS
   ============================================================ */

/**
 * Registra todos los event listeners de la aplicación.
 * Se llama una sola vez al inicio.
 */
function initEventListeners() {

  /* ── Abrir modal "Agregar" ── */
  document.getElementById('open-add-modal').addEventListener('click', openAddModal);

  /* ── Cerrar modal (botón X y cancelar) ── */
  document.getElementById('modal-close').addEventListener('click', () => closeModal('modal'));
  document.getElementById('form-cancel').addEventListener('click', () => closeModal('modal'));

  /* ── Cerrar modal al hacer click en el backdrop ── */
  document.getElementById('modal-backdrop').addEventListener('click', () => closeModal('modal'));

  /* ── Submit del formulario (CREATE / UPDATE) ── */
  document.getElementById('product-form').addEventListener('submit', handleFormSubmit);

  /* ── Diálogo de confirmación DELETE ── */
  document.getElementById('confirm-cancel').addEventListener('click', () => closeModal('confirm-dialog'));
  document.getElementById('confirm-backdrop').addEventListener('click', () => closeModal('confirm-dialog'));
  document.getElementById('confirm-ok').addEventListener('click', deleteProduct);

  /* ── Event delegation: botones Editar/Eliminar en el grid ── */
  document.getElementById('products-grid').addEventListener('click', (e) => {
    const editBtn   = e.target.closest('.js-edit');
    const deleteBtn = e.target.closest('.js-delete');

    if (editBtn)   openEditModal(editBtn.dataset.id);
    if (deleteBtn) openConfirmDialog(deleteBtn.dataset.id);
  });

  /* ── Búsqueda en tiempo real (debounce de 300ms) ── */
  let searchTimeout;
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');

  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    // Mostrar/ocultar botón "limpiar"
    searchClear.hidden = searchInput.value === '';
    // Esperar 300ms después de que el usuario deje de escribir
    searchTimeout = setTimeout(applyFilters, 300);
  });

  searchClear.addEventListener('click', () => {
    searchInput.value  = '';
    searchClear.hidden = true;
    searchInput.focus();
    applyFilters();
  });

  /* ── Filtro por categoría ── */
  document.getElementById('filter-category').addEventListener('change', applyFilters);

  /* ── Ordenamiento ── */
  document.getElementById('filter-sort').addEventListener('change', applyFilters);

  /* ── Cerrar modales con Escape ── */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!document.getElementById('modal').hidden)          closeModal('modal');
      if (!document.getElementById('confirm-dialog').hidden) closeModal('confirm-dialog');
    }
  });

  /* ── Limpiar errores al escribir en los campos del form ── */
  document.getElementById('product-form').addEventListener('input', (e) => {
    const group = e.target.closest('.form-group');
    if (group?.classList.contains('has-error')) {
      group.classList.remove('has-error');
      group.querySelector('.form-error').textContent = '';
    }
  });
}

/**
 * Punto de entrada principal.
 * Inicializa la app: eventos, categorías y carga inicial de productos.
 */
async function init() {
  // 1. Registrar todos los event listeners
  initEventListeners();

  // 2. Obtener categorías (para los selects)
  await fetchCategories();

  // 3. Cargar productos desde la API
  await fetchProducts();

  // 4. Inicializar íconos de Lucide
  if (window.lucide) lucide.createIcons();
}

// Ejecutar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', init);

/* ============================================================
   ┌─────────────────────────────────────────────────────────┐
   │              RESUMEN DEL FLUJO CRUD                     │
   ├─────────────────────────────────────────────────────────┤
   │                                                         │
   │  READ   → fetchProducts()                               │
   │           GET /products                                 │
   │           → renderProducts() → buildCardHTML()          │
   │                                                         │
   │  CREATE → openAddModal()                                │
   │           Usuario llena el formulario                   │
   │           → handleFormSubmit() → createProduct()        │
   │           POST /products  { title, price, desc... }     │
   │           → actualiza state.products → applyFilters()   │
   │                                                         │
   │  UPDATE → click "Editar" → openEditModal(id)            │
   │           GET /products/:id (o estado local)            │
   │           → pre-rellena formulario                      │
   │           → handleFormSubmit() → updateProduct(id)      │
   │           PUT /products/:id { ...payload }              │
   │           → actualiza state.products → applyFilters()   │
   │                                                         │
   │  DELETE → click "Eliminar" → openConfirmDialog(id)      │
   │           Usuario confirma → deleteProduct()            │
   │           DELETE /products/:id                          │
   │           → filtra state.products → applyFilters()      │
   │                                                         │
   │  NOTA: FakeStore API no persiste los cambios en         │
   │  CREATE/UPDATE/DELETE — los datos son ficticios.        │
   │  Por eso mantenemos el estado local sincronizado.       │
   └─────────────────────────────────────────────────────────┘
   ============================================================ */