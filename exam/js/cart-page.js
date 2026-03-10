/**
 * cart-page.js — логика страницы корзины
 * тут показываю товары, считаю сумму, отправляю заказ
 */

// массив с объектами товаров, которые лежат в корзине
let cartGoods = [];

// когда страница загрузилась, начинаем работу
document.addEventListener('DOMContentLoaded', async () => {
  updateCartCounter(); // обновляем счётчик в шапке

  // ставим минимальную дату доставки — завтрашний день
  const dateInput = document.getElementById('order-date');
  if (dateInput) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.min = tomorrow.toISOString().split('T')[0];
  }

  // если меняют дату или интервал, пересчитываем стоимость доставки
  document.getElementById('order-date')?.addEventListener('change', updateOrderSummary);
  document.getElementById('order-interval')?.addEventListener('change', updateOrderSummary);

  // грузим все товары из корзины
  await loadCartGoods();

  // кнопка оформления заказа
  document.getElementById('submit-order')?.addEventListener('click', submitOrder);
});

// ── Загрузка товаров корзины ──────────────────────────────────────────────────

// получаем данные каждого товара по айдишникам из корзины
const loadCartGoods = async () => {
  const cartIds = getCart(); // айдишники из localStorage
  const grid    = document.getElementById('cart-grid');
  const emptyEl = document.getElementById('cart-empty');

  // если корзина пустая, показываем заглушку
  if (cartIds.length === 0) {
    grid.innerHTML = '';
    emptyEl.classList.remove('hidden');
    updateOrderSummary(); // обнуляем сумму
    return;
  }

  // пока грузится, показываем спиннер
  grid.innerHTML = '<div class="loader"><div class="loader__spinner"></div></div>';

  try {
    // параллельно грузим все товары
    cartGoods = await Promise.all(cartIds.map((id) => getGoodById(id)));
    renderCartGoods(cartGoods); // рисуем карточки
    updateOrderSummary(); // считаем сумму
  } catch {
    // если ошибка, показываем сообщение
    grid.innerHTML = '<p class="cart-items-error">Не удалось загрузить товары корзины</p>';
    showNotification('Ошибка загрузки корзины', 'error');
  }
};

// ── Отрисовка карточек корзины ────────────────────────────────────────────────

// создаю карточки для каждого товара и вставляю на страницу
const renderCartGoods = (goods) => {
  const grid = document.getElementById('cart-grid');
  grid.innerHTML = '';

  goods.forEach((good) => {
    // цена со скидкой, если есть
    const price = (good.discount_price && good.discount_price < good.actual_price)
      ? good.discount_price
      : good.actual_price;

    const card = document.createElement('article');
    card.className = 'cart-card';
    card.dataset.id = good.id;

    // картинка: если есть ссылка, показываем, иначе плейсхолдер
    const imageHtml = good.image_url
      ? `<img class="cart-card__image" src="${good.image_url}" alt="${good.name}"
             loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
         <div class="cart-card__image-placeholder hidden">🖼<br>Нет фото</div>`
      : `<div class="cart-card__image-placeholder">🖼<br>Нет фото</div>`;

    card.innerHTML = `
      <div class="cart-card__image-wrap">${imageHtml}</div>
      <div class="cart-card__body">
        <h3 class="cart-card__name" title="${good.name}">${good.name}</h3>
        <div class="product-card__rating">
          <span class="product-card__rating-value">${Number(good.rating).toFixed(1)}</span>
          <span class="stars">${renderCartStars(good.rating)}</span>
        </div>
        <div class="cart-card__price">${formatCartPrice(price)}</div>
        <button class="cart-card__remove" data-id="${good.id}" aria-label="Удалить товар">
          🗑 Удалить
        </button>
      </div>
    `;

    // вешаем обработчик на кнопку удаления
    card.querySelector('.cart-card__remove').addEventListener('click', () => {
      handleRemoveFromCart(good, card);
    });

    grid.appendChild(card);
  });
};

// когда нажимают удалить, убираем товар из корзины
const handleRemoveFromCart = (good, cardElement) => {
  removeFromCart(good.id); // удаляем из localStorage
  cartGoods = cartGoods.filter((cartGood) => cartGood.id !== good.id); // удаляем из массива
  cardElement.remove(); // убираем карточку со страницы

  // если товаров больше нет, показываем заглушку
  if (cartGoods.length === 0) {
    document.getElementById('cart-empty').classList.remove('hidden');
  }

  updateOrderSummary(); // пересчитываем сумму
  showNotification(`«${good.name.substring(0, 40)}» удалён из корзины`, 'info');
};

// обновляю все суммы в блоке итого
const updateOrderSummary = () => {
  // считаем стоимость всех товаров
  const goodsTotal = cartGoods.reduce((sum, good) => {
    const price = (good.discount_price && good.discount_price < good.actual_price)
      ? good.discount_price
      : good.actual_price;
    return sum + price;
  }, 0);

  const selectedDate     = document.getElementById('order-date')?.value;
  const selectedInterval = document.getElementById('order-interval')?.value;
  const deliveryCost     = calculateDeliveryCost(selectedDate, selectedInterval);

  document.getElementById('summary-goods').textContent    = formatCartPrice(goodsTotal);
  document.getElementById('summary-delivery').textContent = formatCartPrice(deliveryCost);
  document.getElementById('summary-total').textContent    = formatCartPrice(goodsTotal + deliveryCost);
};

/**
 * считаю доставку по формуле:
 * базовая 200 ₽
 * если выходные (сб, вс) +300 ₽
 * если будни и вечер (18-22) +200 ₽
 */
const calculateDeliveryCost = (dateString, interval) => {
  const baseCost = 200;
  if (!dateString) return baseCost;

  const selectedDate = new Date(dateString);
  const dayOfWeek    = selectedDate.getDay(); // 0 - воскресенье, 6 - суббота
  const isWeekend    = dayOfWeek === 0 || dayOfWeek === 6;

  if (isWeekend) return baseCost + 300;
  if (interval === '18:00-22:00') return baseCost + 200;
  return baseCost;
};


// собираю всё с формы и отправляю на сервер
const submitOrder = async () => {
  // проверяем, что корзина не пустая
  if (cartGoods.length === 0) {
    showNotification('Корзина пуста!', 'error');
    return;
  }

  // собираем значения из полей
  const fullName        = document.getElementById('order-name')?.value.trim();
  const email           = document.getElementById('order-email')?.value.trim();
  const phone           = document.getElementById('order-phone')?.value.trim();
  const deliveryAddress = document.getElementById('order-address')?.value.trim();
  const rawDate         = document.getElementById('order-date')?.value; // YYYY-MM-DD
  const deliveryInterval= document.getElementById('order-interval')?.value;
  const comment         = document.getElementById('order-comment')?.value.trim();
  const subscribe       = document.getElementById('order-subscribe')?.checked ? 1 : 0;

  // проверяем, что все обязательные поля заполнены
  if (!fullName || !email || !phone || !deliveryAddress || !rawDate || !deliveryInterval) {
    showNotification('Заполните все обязательные поля', 'error');
    return;
  }

  // дату переделываем из YYYY-MM-DD в dd.mm.yyyy как просит API
  const deliveryDate = formatDateForApi(rawDate);

  // собираем объект для отправки
  const orderData = {
    full_name:         fullName,
    email,
    phone,
    delivery_address:  deliveryAddress,
    delivery_date:     deliveryDate,
    delivery_interval: deliveryInterval,
    comment,
    subscribe,
    good_ids: cartGoods.map((good) => good.id),
  };

  // блокируем кнопку, чтобы не отправили дважды
  const submitBtn = document.getElementById('submit-order');
  submitBtn.disabled    = true;
  submitBtn.textContent = 'Оформляем...';

  try {
    await createOrder(orderData); // отправляем на сервер
    clearCart(); // очищаем localStorage
    showNotification('Заказ успешно оформлен! Спасибо за покупку 🎉', 'success');
    // немного ждём и редиректим на главную
    setTimeout(() => { window.location.href = 'index.html'; }, 1800);
  } catch (err) {
    // если ошибка, разблокируем кнопку и показываем сообщение
    showNotification('Ошибка при оформлении заказа. Попробуйте ещё раз.', 'error');
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Оформить заказ';
    console.error('Ошибка создания заказа:', err);
  }
};

// делаю красивую цену с пробелами и символом рубля
const formatCartPrice = (amount) => `${Number(amount).toLocaleString('ru-RU')} ₽`;

// рисую звёздочки по рейтингу
const renderCartStars = (rating) => {
  const filledCount = Math.round(Number(rating));
  return '★'.repeat(Math.max(0, filledCount)) + '☆'.repeat(Math.max(0, 5 - filledCount));
};