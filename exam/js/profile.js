/**
 * profile.js — личный кабинет: список заказов и CRUD через модальные окна
 */

let ordersData      = [];
let editingOrderId  = null;
let deletingOrderId = null;

document.addEventListener('DOMContentLoaded', async () => {
  updateCartCounter();
  await loadOrders();

  // Навешиваем обработчики на кнопки модалок через addEventListener,
  // а не через inline onclick в HTML
  initModalButtons();

  // Закрытие модалок по клику на тёмный оверлей
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) closeAllModals();
  });

  // Закрытие модалок по клавише Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllModals();
  });
});

/**
 * Привязывает обработчики ко всем кнопкам внутри модальных окон.
 * Вызывается один раз при инициализации страницы.
 */
const initModalButtons = () => {
  // Кнопки закрытия (×) во всех модалках
  document.querySelectorAll('.modal__close').forEach((btn) => {
    btn.addEventListener('click', closeAllModals);
  });

  // Кнопки «Отмена» и «Закрыть»
  document.querySelectorAll('[data-action="cancel"]').forEach((btn) => {
    btn.addEventListener('click', closeAllModals);
  });

  // Кнопка «Сохранить» в модалке редактирования
  document.getElementById('btn-save-edit')?.addEventListener('click', saveEditOrder);

  // Кнопка «Да, удалить» в модалке подтверждения
  document.getElementById('btn-confirm-delete')?.addEventListener('click', confirmDeleteOrder);
};

// ── Загрузка и отрисовка заказов ──────────────────────────────────────────────

/** Загружает заказы с сервера и отображает их в таблице */
const loadOrders = async () => {
  const tbody = document.getElementById('orders-tbody');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="7" class="orders-empty">
        <div class="loader"><div class="loader__spinner"></div></div>
      </td>
    </tr>`;

  try {
    ordersData = await getOrders();
    renderOrders(ordersData);
  } catch {
    tbody.innerHTML = '<tr><td colspan="7" class="orders-empty">Ошибка загрузки заказов</td></tr>';
    showNotification('Не удалось загрузить заказы', 'error');
  }
};

/** Отрисовывает таблицу заказов */
const renderOrders = (orders) => {
  const tbody = document.getElementById('orders-tbody');
  if (!tbody) return;

  if (!orders.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="orders-empty">У вас ещё нет заказов</td></tr>';
    return;
  }

  tbody.innerHTML = '';

  orders.forEach((order) => {
    const row = document.createElement('tr');

    // Список id товаров в виде строки
    const goodIds   = Array.isArray(order.good_ids) ? order.good_ids.join(', ') : '—';
    const orderDate = formatDateForDisplay(order.created_at);

    // Дата доставки хранится в формате dd.mm.yyyy — переводим для отображения
    const deliveryDate = order.delivery_date
      ? new Date(order.delivery_date.split('.').reverse().join('-')).toLocaleDateString('ru-RU')
      : '—';

    const totalPrice = order.total_price
      ? `${Number(order.total_price).toLocaleString('ru-RU')} ₽`
      : '—';

    row.innerHTML = `
      <td>${order.id}</td>
      <td>${orderDate}</td>
      <td class="orders-table__composition" title="${goodIds}">${goodIds}</td>
      <td>${totalPrice}</td>
      <td>${deliveryDate}</td>
      <td>${order.delivery_interval || '—'}</td>
      <td>
        <div class="orders-table__actions">
          <button class="btn btn--icon" title="Просмотр"      data-action="view"   data-id="${order.id}" aria-label="Просмотреть заказ">👁️</button>
          <button class="btn btn--icon" title="Редактировать" data-action="edit"   data-id="${order.id}" aria-label="Редактировать заказ">✏️</button>
          <button class="btn btn--icon btn--icon-danger" title="Удалить" data-action="delete" data-id="${order.id}" aria-label="Удалить заказ">🗑️</button>
        </div>
      </td>
    `;

    // Делегирование: один обработчик на строку вместо трёх отдельных
    row.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const { action, id } = btn.dataset;
        const orderId = parseInt(id, 10);
        if (action === 'view')   viewOrder(orderId);
        if (action === 'edit')   openEditModal(orderId);
        if (action === 'delete') openDeleteModal(orderId);
      });
    });

    tbody.appendChild(row);
  });
};

// ── ПРОСМОТР ЗАКАЗА ───────────────────────────────────────────────────────────

/** Открывает модалку с подробностями заказа */
const viewOrder = (orderId) => {
  const order = ordersData.find((item) => item.id === orderId);
  if (!order) return;

  document.getElementById('view-modal-title').textContent = `Заказ №${order.id}`;

  const fields = [
    ['Полное имя',     order.full_name || '—'],
    ['Email',          order.email || '—'],
    ['Телефон',        order.phone || '—'],
    ['Адрес доставки', order.delivery_address || '—'],
    ['Дата доставки',  order.delivery_date || '—'],
    ['Интервал',       order.delivery_interval || '—'],
    ['Рассылка',       order.subscribe ? 'Да' : 'Нет'],
    ['Товары (id)',    Array.isArray(order.good_ids) ? order.good_ids.join(', ') : '—'],
    ['Комментарий',    order.comment || '—'],
    ['Дата заказа',    formatDateForDisplay(order.created_at)],
  ];

  document.getElementById('view-modal-content').innerHTML = fields.map(([label, value]) => `
    <div class="order-view-field">
      <label>${label}</label>
      <span>${value}</span>
    </div>
  `).join('');

  openModal('modal-view');
};

// ── РЕДАКТИРОВАНИЕ ЗАКАЗА ─────────────────────────────────────────────────────

/** Открывает модалку редактирования и заполняет поля данными заказа */
const openEditModal = (orderId) => {
  const order = ordersData.find((item) => item.id === orderId);
  if (!order) return;

  editingOrderId = orderId;
  document.getElementById('edit-modal-title').textContent = `Редактирование заказа №${orderId}`;

  setFieldValue('edit-name',     order.full_name || '');
  setFieldValue('edit-email',    order.email || '');
  setFieldValue('edit-phone',    order.phone || '');
  setFieldValue('edit-address',  order.delivery_address || '');
  setFieldValue('edit-comment',  order.comment || '');
  setFieldValue('edit-interval', order.delivery_interval || '');

  // Преобразуем дату из dd.mm.yyyy в YYYY-MM-DD для input[type=date]
  const dateInput = document.getElementById('edit-delivery-date');
  if (dateInput && order.delivery_date) {
    const dateParts = order.delivery_date.split('.');
    dateInput.value = dateParts.length === 3
      ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`
      : '';
    dateInput.min = new Date().toISOString().split('T')[0];
  }

  const subscribeCheckbox = document.getElementById('edit-subscribe');
  if (subscribeCheckbox) subscribeCheckbox.checked = !!order.subscribe;

  openModal('modal-edit');
};

/** Сохраняет изменения заказа и отправляет PUT-запрос на сервер */
const saveEditOrder = async () => {
  if (!editingOrderId) return;

  const fullName        = document.getElementById('edit-name')?.value.trim();
  const email           = document.getElementById('edit-email')?.value.trim();
  const phone           = document.getElementById('edit-phone')?.value.trim();
  const deliveryAddress = document.getElementById('edit-address')?.value.trim();
  const rawDate         = document.getElementById('edit-delivery-date')?.value;
  const deliveryInterval= document.getElementById('edit-interval')?.value;
  const comment         = document.getElementById('edit-comment')?.value.trim();
  const subscribe       = document.getElementById('edit-subscribe')?.checked ? 1 : 0;

  if (!fullName || !email || !phone || !deliveryAddress) {
    showNotification('Заполните все обязательные поля', 'error');
    return;
  }

  // Переводим дату из YYYY-MM-DD в dd.mm.yyyy для API
  const deliveryDate = formatDateForApi(rawDate);

  try {
    await updateOrder(editingOrderId, {
      full_name:         fullName,
      email,
      phone,
      delivery_address:  deliveryAddress,
      delivery_date:     deliveryDate,
      delivery_interval: deliveryInterval,
      comment,
      subscribe,
    });
    showNotification('Заказ успешно обновлён', 'success');
    closeAllModals();
    await loadOrders();
  } catch {
    showNotification('Не удалось обновить заказ', 'error');
  }
};

// ── УДАЛЕНИЕ ЗАКАЗА ───────────────────────────────────────────────────────────

/** Открывает модалку подтверждения удаления */
const openDeleteModal = (orderId) => {
  deletingOrderId = orderId;
  openModal('modal-delete');
};

/** Отправляет DELETE-запрос и обновляет список заказов */
const confirmDeleteOrder = async () => {
  if (!deletingOrderId) return;
  try {
    await deleteOrder(deletingOrderId);
    showNotification('Заказ удалён', 'success');
    closeAllModals();
    await loadOrders();
  } catch {
    showNotification('Не удалось удалить заказ', 'error');
  }
};

// ── Утилиты модалок ───────────────────────────────────────────────────────────

/** Показывает модальное окно по его id */
const openModal = (modalId) => {
  document.getElementById(modalId)?.classList.remove('hidden');
};

/** Закрывает все открытые модальные окна */
const closeAllModals = () => {
  document.querySelectorAll('.modal-overlay').forEach((modal) => modal.classList.add('hidden'));
  editingOrderId  = null;
  deletingOrderId = null;
};

/** Устанавливает значение поля по его id */
const setFieldValue = (fieldId, value) => {
  const field = document.getElementById(fieldId);
  if (field) field.value = value;
};