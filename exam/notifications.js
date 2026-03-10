/**
 * notifications.js — система всплывающих уведомлений
 * показываются в правом верхнем углу, сами исчезают через 5 секунд
 */

let notifCounter = 0; // счётчик для уникальных id

// показываем уведомление с текстом и типом (success, error, info)
const showNotification = (message, type = 'info') => {
  const container = document.getElementById('notifications');
  if (!container) return; // если контейнера нет, ничего не делаем

  const id = ++notifCounter; // уникальный айди для этого уведомления

  // иконки для разных типов
  const icons = { success: '✓', error: '✕', info: 'ℹ' };

  // создаём элемент уведомления
  const el = document.createElement('div');
  el.className = `notification notification--${type}`;
  el.dataset.id = id;
  el.innerHTML = `
    <span class="notification__icon">${icons[type]}</span>
    <span class="notification__text">${message}</span>
    <button class="notification__close" aria-label="Закрыть">×</button>
  `;

  // крестик закрывает уведомление сразу
  el.querySelector('.notification__close').addEventListener('click', () => {
    hideNotification(id);
  });

  container.appendChild(el);

  // через 5 секунд убираем автоматически
  setTimeout(() => hideNotification(id), 5000);

  return id;
};

// скрываем уведомление с анимацией исчезновения
const hideNotification = (id) => {
  const container = document.getElementById('notifications');
  if (!container) return;

  const el = container.querySelector(`[data-id="${id}"]`);
  if (el) {
    // сначала делаем прозрачным и сдвигаем вправо
    el.style.opacity = '0';
    el.style.transform = 'translateX(40px)';
    el.style.transition = 'opacity 0.25s, transform 0.25s';
    // потом удаляем из DOM
    setTimeout(() => el.remove(), 280);
  }
};
