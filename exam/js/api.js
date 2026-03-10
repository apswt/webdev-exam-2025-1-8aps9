const API_BASE = 'https://edu.std-900.ist.mospolytech.ru/exam-2024-1/api';
const API_KEY  = '9bfff648-50a5-49b4-848f-f3cdb533a8d7'; // это мой ключ, не потеряйте

// добавляет ключ к любому урлу, типа хелпер
const withKey = (url) => {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}api_key=${API_KEY}`;
};

// получить все товары, можно с поиском по строке
const getGoods = async (query = '') => {
  try {
    let url = `${API_BASE}/goods`;
    if (query) url += `?query=${encodeURIComponent(query)}`;
    const response = await fetch(withKey(url));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    // там по разному приходит, то массив то объект, я все случаи проверила
    return Array.isArray(data) ? data : (data.items || data.goods || []);
  } catch (error) {
    console.error('getGoods error:', error);
    throw error;
  }
};

// автодополнение для поиска, пока пользователь печатает
const getAutocomplete = async (query) => {
  try {
    const url = `${API_BASE}/autocomplete?query=${encodeURIComponent(query)}`;
    const response = await fetch(withKey(url));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    // приходит просто массив строк ["айфон", "самсунг", ...]
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('getAutocomplete error:', error);
    return []; // если ошибка, пусть будет пустой массив, чем краш
  }
};

// получить один товар по айдишнику, для детальной страницы
const getGoodById = async (id) => {
  try {
    const response = await fetch(withKey(`${API_BASE}/goods/${id}`));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('getGoodById error:', error);
    throw error;
  }
};

// получить все заказы пользователя
const getOrders = async () => {
  try {
    const response = await fetch(withKey(`${API_BASE}/orders`));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data : (data.items || data.orders || []);
  } catch (error) {
    console.error('getOrders error:', error);
    throw error;
  }
};

// получить конкретный заказ
const getOrderById = async (id) => {
  try {
    const response = await fetch(withKey(`${API_BASE}/orders/${id}`));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('getOrderById error:', error);
    throw error;
  }
};

// создать новый заказ, передаю объект с данными
const createOrder = async (orderData) => {
  try {
    const response = await fetch(withKey(`${API_BASE}/orders`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('createOrder error:', error);
    throw error;
  }
};

// обновить заказ, PUT запрос
const updateOrder = async (id, orderData) => {
  try {
    const response = await fetch(withKey(`${API_BASE}/orders/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('updateOrder error:', error);
    throw error;
  }
};

// удалить заказ по айди
const deleteOrder = async (id) => {
  try {
    const response = await fetch(withKey(`${API_BASE}/orders/${id}`), {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('deleteOrder error:', error);
    throw error;
  }
};

// форматирую дату из YYYY-MM-DD в dd.mm.yyyy, API такое хочет
const formatDateForApi = (isoDate) => {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
};

// для показа даты пользователю в красивом виде
const formatDateForDisplay = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('ru-RU');
  } catch { return dateStr; }
};