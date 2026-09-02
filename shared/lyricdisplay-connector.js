(() => {
  function normalize(settings) {
    const serverUrl = String(settings?.serverUrl || '').trim().replace(/\/+$/, '');
    const joinCode = String(settings?.joinCode || '').replace(/\D/g, '').slice(0, 6);
    if (!/^https?:\/\//i.test(serverUrl)) throw new Error('Адрес должен начинаться с http:// или https://.');
    if (!/^\d{6}$/.test(joinCode)) throw new Error('Введите 6-значный код подключения.');
    return { serverUrl, joinCode };
  }
  async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || data.message || `HTTP ${response.status}`);
    return data;
  }
  async function getToken(settings, clientId) {
    const normalized = normalize(settings);
    await fetchJson(`${normalized.serverUrl}/api/health`);
    const response = await fetchJson(`${normalized.serverUrl}/api/auth/token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientType: 'web', deviceId: clientId, sessionId: `${clientId}-${Date.now()}`, joinCode: normalized.joinCode }) });
    if (!response.token) throw new Error('LyricDisplay не вернул токен авторизации.');
    return response.token;
  }
  async function connect(settings, clientId) {
    if (typeof io !== 'function') throw new Error('Клиент Socket.IO не загрузился.');
    const normalized = normalize(settings);
    const token = await getToken(normalized, clientId);
    return io(normalized.serverUrl, { auth: { token }, transports: ['websocket', 'polling'], reconnection: true, reconnectionAttempts: Infinity, timeout: 10000 });
  }
  window.lyricDisplayConnector = { normalize, fetchJson, getToken, connect };
})();
