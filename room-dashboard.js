const roomList = document.getElementById('roomList');
const connection = document.getElementById('connection');
const connectionText = document.getElementById('connectionText');
const filter = document.getElementById('roomFilter');
const emptyMessage = document.getElementById('emptyMessage');
let lastRooms = [];
let offlineAfterMs = 45000;

function formatAge(timestamp, now) {
  if (!timestamp) return 'No update received';
  const elapsed = Math.max(0, now - new Date(timestamp).getTime());
  if (!Number.isFinite(elapsed)) return 'Update time unavailable';
  if (elapsed < 60000) return `Updated ${Math.max(1, Math.floor(elapsed / 1000))} sec ago`;
  if (elapsed < 3600000) return `Updated ${Math.floor(elapsed / 60000)} min ago`;
  return `Updated ${Math.floor(elapsed / 3600000)} hr ago`;
}

function getDisplayStatus(room, now) {
  if (!room.updatedAt || !['available', 'occupied'].includes(room.status)) return 'unknown';
  const age = now - new Date(room.updatedAt).getTime();
  return Number.isFinite(age) && age <= offlineAfterMs ? room.status : 'offline';
}

function renderRooms() {
  const now = Date.now();
  const rooms = lastRooms.map(room => ({ ...room, displayStatus: getDisplayStatus(room, now) }));
  const counts = { available: 0, occupied: 0, offline: 0 };
  for (const room of rooms) {
    if (room.displayStatus === 'unknown' || room.displayStatus === 'offline') counts.offline += 1;
    else counts[room.displayStatus] += 1;
  }
  document.getElementById('availableCount').textContent = counts.available;
  document.getElementById('occupiedCount').textContent = counts.occupied;
  document.getElementById('offlineCount').textContent = counts.offline;
  document.getElementById('roomTotal').textContent = `(${rooms.length})`;

  const filteredRooms = filter.value === 'all'
    ? rooms
    : rooms.filter(room => filter.value === 'offline'
      ? room.displayStatus === 'offline' || room.displayStatus === 'unknown'
      : room.displayStatus === filter.value);

  roomList.replaceChildren();
  emptyMessage.hidden = filteredRooms.length > 0;
  for (const room of filteredRooms) {
    const card = document.createElement('article');
    card.className = 'room-card';
    const top = document.createElement('div');
    top.className = 'room-top';
    const name = document.createElement('h3');
    name.className = 'room-name';
    name.textContent = room.name;
    const badge = document.createElement('span');
    badge.className = `status status-${room.displayStatus}`;
    badge.textContent = room.displayStatus === 'unknown'
      ? 'Waiting for device'
      : room.displayStatus.charAt(0).toUpperCase() + room.displayStatus.slice(1);
    const meta = document.createElement('p');
    meta.className = 'room-meta';
    meta.textContent = `${room.id} · ${formatAge(room.updatedAt, now)}`;
    top.append(name, badge);
    card.append(top, meta);
    roomList.append(card);
  }
}

async function refreshRooms() {
  try {
    const response = await fetch('/api/rooms', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.rooms)) throw new Error('Invalid room data received');
    lastRooms = data.rooms;
    if (Number.isFinite(data.offlineAfterMs) && data.offlineAfterMs > 0) {
      offlineAfterMs = data.offlineAfterMs;
    }
    connection.dataset.state = 'online';
    connectionText.textContent = 'Dashboard connected';
    document.getElementById('lastSync').textContent = `Synced ${new Date().toLocaleTimeString()}`;
    renderRooms();
  } catch (error) {
    connection.dataset.state = 'offline';
    connectionText.textContent = 'Dashboard unavailable';
    if (!lastRooms.length) {
      roomList.replaceChildren();
      const message = document.createElement('p');
      message.className = 'loading-card';
      message.textContent = 'Cannot load room status. Check that the dashboard server is running.';
      roomList.append(message);
    } else {
      renderRooms();
    }
    console.error('Unable to refresh room status:', error);
  }
}

filter.addEventListener('change', renderRooms);
refreshRooms();
window.setInterval(refreshRooms, 5000);
window.setInterval(renderRooms, 1000);
