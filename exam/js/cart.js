/**
 * cart.js — управление корзиной (localStorage)
 * тут всё просто: добавляем, удаляем, чистим
 * корзина хранится как массив айдишников
 */

const CART_KEY = 'shop_cart';

// достаю корзину из localStorage
const getCart = () => {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return []; // если что-то сломалось, возвращаем пустую корзину
  }
};

// сохраняю корзину и обновляю счётчик в шапке
const saveCart = (cart) => {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCounter();
};

// добавляю товар по айди, если его ещё нет
const addToCart = (id) => {
  const cart = getCart();
  if (!cart.includes(id)) {
    cart.push(id);
    saveCart(cart);
    return true; // товар добавился
  }
  return false; // товар уже был в корзине
};

// удаляю товар из корзины
const removeFromCart = (id) => {
  const cart = getCart().filter((itemId) => itemId !== id);
  saveCart(cart);
};

// полностью очищаю корзину
const clearCart = () => {
  localStorage.removeItem(CART_KEY);
  updateCartCounter();
};

// проверяю, есть ли товар в корзине
const isInCart = (id) => getCart().includes(id);

// считаю общую сумму товаров (передаю массив объектов товаров)
const calculateTotal = (goods) => {
  return goods.reduce((sum, good) => {
    const price = good.discount_price ?? good.actual_price;
    return sum + price;
  }, 0);
};

// рассчитываю стоимость доставки в зависимости от дня и времени
const calculateDelivery = (date, timeSlot) => {
  if (!date || !timeSlot) return 200; // по умолчанию 200

  const d = new Date(date);
  const dayOfWeek = d.getDay(); // 0 = воскресенье, 6 = суббота
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (isWeekend) return 500; // 200 + 300 за выходные

  // вечернее время в будни
  if (timeSlot === '18:00-21:00') return 400; // 200 + 200

  return 200; // обычный день
};

// обновляю счётчик корзины во всех элементах на странице
const updateCartCounter = () => {
  const counters = document.querySelectorAll('.header__cart-count');
  const count = getCart().length;
  counters.forEach((el) => {
    el.textContent = count;
    el.style.display = count > 0 ? 'inline-flex' : 'none';
  });
};