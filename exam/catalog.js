/**
 * catalog.js — каталог товаров, фильтры, сортировка, автодополнение поиска
 * тут самая сложная страница, много всего намешано
 */

const ITEMS_PER_PAGE = 12; // сколько карточек показывать за раз

let allGoods      = []; // все товары с сервера
let filteredGoods = []; // отфильтрованные и отсортированные
let shownCount    = 0;  // сколько уже показали

// ── Инициализация ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  updateCartCounter(); // обновляем цифру в корзине
  await fetchAndRender(); // грузим товары и рисуем

  const searchInput = document.getElementById('search-input');
  const searchBtn   = document.getElementById('search-btn');

  // поиск по кнопке или энтеру
  searchBtn?.addEventListener('click', triggerSearch);
  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      hideAutocomplete();
      triggerSearch();
    }
  });

  // автодополнение когда печатаешь
  searchInput?.addEventListener('input', handleSearchInput);

  // закрываем подсказки если кликнули мимо
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.header__search')) {
      hideAutocomplete();
    }
  });

  // фильтры и сортировка
  document.getElementById('apply-filters')?.addEventListener('click', applyAndRender);
  document.getElementById('sort-select')?.addEventListener('change', applyAndRender);

  // кнопка "загрузить ещё"
  document.getElementById('load-more-btn')?.addEventListener('click', showMore);
});

// ── Загрузка товаров с API ────────────────────────────────────────────────────
const fetchAndRender = async (searchQuery = '') => {
  showLoader(); // крутилку показываем
  try {
    allGoods = await getGoods(searchQuery);
    buildCategories(allGoods); // строим чекбоксы категорий
    applyAndRender(); // применяем фильтры и рисуем
  } catch (err) {
    hideLoader();
    showNotification(`Ошибка загрузки: ${err.message}`, 'error');
  }
};

const triggerSearch = () => {
  const searchQuery = document.getElementById('search-input')?.value.trim() || '';
  fetchAndRender(searchQuery);
};

// ── Автодополнение ────────────────────────────────────────────────────────────

// таймер чтобы не дёргать сервер на каждую букву
let autocompleteTimer = null;

/**
 * когда печатают в поиске, ждём 300 мс и запрашиваем подсказки
 */
const handleSearchInput = () => {
  const inputValue = document.getElementById('search-input')?.value || '';

  // если поле пустое, прячем подсказки
  if (!inputValue.trim()) {
    hideAutocomplete();
    return;
  }

  // ставим задержку, пока печатают
  clearTimeout(autocompleteTimer);
  autocompleteTimer = setTimeout(() => {
    fetchAutocompleteSuggestions(inputValue.trim());
  }, 300);
};

/**
 * запрашиваем варианты у сервера через специальный эндпоинт
 * приходит массив строк
 */
const fetchAutocompleteSuggestions = async (query) => {
  const suggestions = await getAutocomplete(query);

  if (suggestions.length === 0) {
    hideAutocomplete();
    return;
  }

  renderAutocomplete(suggestions, query);
};

/**
 * рисуем выпадающий список с подсказками
 * при клике подставляем вариант в поиск
 */
const renderAutocomplete = (suggestions, currentQuery) => {
  // ищем контейнер или создаём новый
  let dropdown = document.getElementById('search-autocomplete');
  if (!dropdown) {
    dropdown = document.createElement('ul');
    dropdown.id = 'search-autocomplete';
    dropdown.className = 'search-autocomplete';
    dropdown.setAttribute('role', 'listbox');
    document.querySelector('.header__search')?.appendChild(dropdown);
  }

  dropdown.innerHTML = '';

  suggestions.forEach((suggestionText) => {
    const item = document.createElement('li');
    item.className = 'search-autocomplete__item';
    item.setAttribute('role', 'option');
    item.textContent = suggestionText;

    item.addEventListener('click', () => {
      applySuggestion(suggestionText, currentQuery);
    });

    dropdown.appendChild(item);
  });

  dropdown.classList.add('search-autocomplete--visible');
};

/**
 * подставляем выбранный вариант в строку поиска
 * заменяем последнее слово, если оно совпадает с началом подсказки
 */
const applySuggestion = (suggestionText, currentQuery) => {
  const searchInput = document.getElementById('search-input');
  if (!searchInput) return;

  // разбиваем запрос на слова
  const queryWords = currentQuery.trim().split(/\s+/);

  // проверяем, начинается ли подсказка с последнего слова
  const lastWord = queryWords[queryWords.length - 1].toLowerCase();
  const suggestionLower = suggestionText.toLowerCase();

  if (lastWord && suggestionLower.startsWith(lastWord)) {
    // заменяем только последнее слово
    queryWords[queryWords.length - 1] = suggestionText;
    searchInput.value = queryWords.join(' ');
  } else {
    // если не совпадает, вставляем всю подсказку
    searchInput.value = suggestionText;
  }

  hideAutocomplete();
  searchInput.focus();
};

/** прячем список подсказок */
const hideAutocomplete = () => {
  const dropdown = document.getElementById('search-autocomplete');
  dropdown?.classList.remove('search-autocomplete--visible');
};

// ── Категории из данных ───────────────────────────────────────────────────────
const buildCategories = (goods) => {
  const container = document.getElementById('categories-list');
  if (!container) return;

  // собираем уникальные категории из поля main_category
  const categories = [...new Set(goods.map((good) => good.main_category).filter(Boolean))].sort();

  if (!categories.length) {
    container.innerHTML = '<span class="text-muted">Нет категорий</span>';
    return;
  }

  container.innerHTML = '';
  categories.forEach((categoryName) => {
    const label = document.createElement('label');
    label.className = 'checkbox-item';
    label.innerHTML = `<input type="checkbox" class="filter-category" value="${categoryName}"> ${categoryName}`;
    container.appendChild(label);
  });
};

// ── Фильтрация + сортировка ───────────────────────────────────────────────────
const applyAndRender = () => {
  const priceFrom       = parseFloat(document.getElementById('price-from')?.value) || 0;
  const priceTo         = parseFloat(document.getElementById('price-to')?.value)   || Infinity;
  const onlyDiscounted  = document.getElementById('filter-discount')?.checked;
  const selectedCats    = [...document.querySelectorAll('.filter-category:checked')].map((cb) => cb.value);
  const sortOrder       = document.getElementById('sort-select')?.value || 'rating-desc';

  // применяем все фильтры
  filteredGoods = allGoods.filter((good) => {
    const price = getEffectivePrice(good);
    if (price < priceFrom || price > priceTo)                          return false;
    if (onlyDiscounted && !(good.discount_price < good.actual_price))  return false;
    if (selectedCats.length && !selectedCats.includes(good.main_category)) return false;
    return true;
  });

  // сортировка по выбранному варианту
  const sorters = {
    'rating-desc': (a, b) => b.rating - a.rating,
    'rating-asc':  (a, b) => a.rating - b.rating,
    'price-desc':  (a, b) => getEffectivePrice(b) - getEffectivePrice(a),
    'price-asc':   (a, b) => getEffectivePrice(a) - getEffectivePrice(b),
  };
  if (sorters[sortOrder]) filteredGoods.sort(sorters[sortOrder]);

  shownCount = 0; // сбрасываем счётчик показанных
  renderGrid(false);
};

// ── Отрисовка сетки ───────────────────────────────────────────────────────────
const renderGrid = (append = false) => {
  const grid = document.getElementById('goods-grid');
  if (!grid) return;

  if (!append) grid.innerHTML = ''; // если не добавляем, чистим сетку

  // если товаров нет и это не добавление
  if (!filteredGoods.length && !append) {
    grid.innerHTML = `
      <div class="catalog__empty">
        <div class="catalog__empty-icon">🔍</div>
        <p class="catalog__empty-text">Нет товаров, соответствующих вашему запросу.</p>
      </div>`;
    updateMoreBtn(false);
    return;
  }

  // берём следующую порцию товаров
  const pageSlice = filteredGoods.slice(shownCount, shownCount + ITEMS_PER_PAGE);
  pageSlice.forEach((good) => grid.appendChild(createCard(good)));
  shownCount += pageSlice.length;

  // показываем или прячем кнопку "загрузить ещё"
  updateMoreBtn(shownCount < filteredGoods.length);
};

const showMore = () => renderGrid(true);

// ── Карточка товара ───────────────────────────────────────────────────────────
const createCard = (good) => {
  const price          = getEffectivePrice(good);
  const hasDiscount    = good.discount_price && good.discount_price < good.actual_price;
  const discountPercent = hasDiscount ? Math.round((1 - good.discount_price / good.actual_price) * 100) : 0;
  const inCart         = isInCart(good.id);
  const imageUrl       = good.image_url || '';

  const card = document.createElement('article');
  card.className = 'product-card';
  card.innerHTML = `
    <div class="product-card__image-wrap">
      ${imageUrl
        ? `<img class="product-card__image" src="${imageUrl}" alt="${escapeHtml(good.name)}"
               loading="lazy"
               onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
           <div class="product-card__image-placeholder" style="display:none">
             <span class="product-card__image-placeholder-icon">🖼</span>
             <span class="product-card__image-placeholder-text">Изображение товара</span>
           </div>`
        : `<div class="product-card__image-placeholder">
             <span class="product-card__image-placeholder-icon">🖼</span>
             <span class="product-card__image-placeholder-text">Изображение товара</span>
           </div>`
      }
      ${hasDiscount ? `<span class="product-card__badge">-${discountPercent}%</span>` : ''}
    </div>
    <div class="product-card__body">
      <h3 class="product-card__name" title="${escapeHtml(good.name)}">${escapeHtml(good.name)}</h3>
      <div class="product-card__rating">
        <span class="product-card__rating-value">${Number(good.rating).toFixed(1)}</span>
        <span class="stars">${renderStars(good.rating)}</span>
      </div>
      <div class="product-card__price">
        <span class="product-card__price-current">${formatPrice(price)}</span>
        ${hasDiscount ? `
          <span class="product-card__price-old">${formatPrice(good.actual_price)}</span>
          <span class="product-card__price-discount">-${discountPercent}%</span>` : ''}
      </div>
    </div>
    <div class="product-card__footer">
      <button class="product-card__btn ${inCart ? 'product-card__btn--added' : ''}"
        data-id="${good.id}">
        ${inCart ? '✓ В корзине' : 'Добавить'}
      </button>
    </div>`;

  // обработчик на кнопку добавления
  card.querySelector('.product-card__btn').addEventListener('click', (e) => {
    const btn   = e.currentTarget;
    const added = addToCart(parseInt(btn.dataset.id, 10));
    if (added) {
      btn.textContent = '✓ В корзине';
      btn.classList.add('product-card__btn--added');
      showNotification(`«${good.name.substring(0, 50)}» добавлен в корзину`, 'success');
    } else {
      showNotification('Товар уже в корзине', 'info');
    }
  });

  return card;
};

// ── Утилиты ───────────────────────────────────────────────────────────────────

/** возвращаем цену со скидкой или обычную */
const getEffectivePrice = (good) =>
  (good.discount_price && good.discount_price < good.actual_price)
    ? good.discount_price
    : good.actual_price;

/** форматируем цену с пробелами и символом рубля */
const formatPrice = (amount) => `${Number(amount).toLocaleString('ru-RU')} ₽`;

/** рисуем звёздочки по рейтингу */
const renderStars = (rating) => {
  const filledCount = Math.min(5, Math.max(0, Math.round(Number(rating))));
  return '★'.repeat(filledCount) + '☆'.repeat(5 - filledCount);
};

/** защита от xss, экранируем спецсимволы */
const escapeHtml = (str) => String(str)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/** показываем спиннер загрузки */
const showLoader = () => {
  const grid = document.getElementById('goods-grid');
  if (grid) grid.innerHTML = '<div class="loader"><div class="loader__spinner"></div></div>';
};

/** прячем спиннер */
const hideLoader = () => {
  const grid = document.getElementById('goods-grid');
  if (grid) grid.innerHTML = '';
};

/** показываем или прячем кнопку "загрузить ещё" */
const updateMoreBtn = (show) => {
  const btn = document.getElementById('load-more-btn');
  if (btn) btn.classList.toggle('hidden', !show);
};
