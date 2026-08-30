/* global io */
const state = {
  preferences: { serverUrl: 'http://localhost:4000', joinCode: '' },
  socket: null, lyrics: [], selectedIndex: null,
  listener: { active: false, recognition: null, mode: 'auto', threshold: 78, lastIndex: -1, lastAt: 0 },
};
const el = {
  dot: document.querySelector('#connection-dot'), connection: document.querySelector('#connection-label'),
  settingsButton: document.querySelector('#settings-button'), settingsDialog: document.querySelector('#settings-dialog'),
  settingsForm: document.querySelector('#settings-form'), serverUrl: document.querySelector('#server-url'), joinCode: document.querySelector('#join-code'),
  test: document.querySelector('#test-button'), connect: document.querySelector('#connect-button'), refresh: document.querySelector('#refresh-button'),
  songName: document.querySelector('#song-name'), lineCount: document.querySelector('#line-count'), lyricsList: document.querySelector('#lyrics-list'),
  message: document.querySelector('#message'), listenerToggle: document.querySelector('#listener-toggle'), listenerStatus: document.querySelector('#listener-status'),
  transcript: document.querySelector('#transcript'), match: document.querySelector('#match-status'), mode: document.querySelector('#listener-mode'),
  threshold: document.querySelector('#threshold'), thresholdValue: document.querySelector('#threshold-value'),
};
function normalize(value) { return String(value || '').toLowerCase().replace(/ё/g, 'е').replace(/[.,;:!?()[\]{}"'«»—–-]/g, ' ').replace(/\s+/g, ' ').trim(); }
function setMessage(text, type = '') { el.message.textContent = text; el.message.className = `message ${type}`; }
function setConnected(connected, label) { el.dot.className = `dot ${connected ? 'online' : ''}`; el.connection.textContent = label; }
function lineText(line) { if (typeof line === 'string') return line; return line?.displayText || [line?.line1, line?.line2].filter(Boolean).join(' ') || line?.mainLine || ''; }
function renderLyrics() {
  el.lyricsList.replaceChildren();
  if (!state.lyrics.length) { el.lyricsList.innerHTML = '<div class="empty">Подключитесь к LyricDisplay и добавьте песню там.</div>'; el.songName.textContent = 'Песня не загружена'; el.lineCount.textContent = '0 строк'; return; }
  el.songName.textContent = state.preferences.songName || 'Песня из LyricDisplay'; el.lineCount.textContent = `${state.lyrics.length} строк`;
  state.lyrics.forEach((line, index) => {
    const row = document.createElement('div'); row.className = `lyric-row ${index === state.selectedIndex ? 'active' : ''} ${index === state.listener.lastIndex ? 'matched' : ''}`;
    const number = document.createElement('span'); number.className = 'line-number'; number.textContent = String(index + 1).padStart(2, '0');
    const text = document.createElement('span'); text.className = 'line-text'; text.textContent = lineText(line) || '—';
    const choose = document.createElement('button'); choose.className = 'line-button'; choose.type = 'button'; choose.textContent = 'Показать'; choose.addEventListener('click', () => pushLine(index));
    row.append(number, text, choose); el.lyricsList.appendChild(row);
  });
}
function currentSettings() { return { serverUrl: String(el.serverUrl.value || state.preferences.serverUrl).trim().replace(/\/+$/, ''), joinCode: String(el.joinCode.value || '').replace(/\D/g, '').slice(0, 6) }; }
async function fetchJson(url, options = {}) { const response = await fetch(url, options); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || data.message || `HTTP ${response.status}`); return data; }
async function getToken(settings) {
  if (!/^https?:\/\//i.test(settings.serverUrl)) throw new Error('Адрес должен начинаться с http:// или https://.');
  if (!/^\d{6}$/.test(settings.joinCode)) throw new Error('Введите 6-значный код подключения.');
  await fetchJson(`${settings.serverUrl}/api/health`);
  const response = await fetchJson(`${settings.serverUrl}/api/auth/token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientType: 'web', deviceId: 'lyricdisplay-song-controller', sessionId: `song-controller-${Date.now()}`, joinCode: settings.joinCode }) });
  if (!response.token) throw new Error('LyricDisplay не вернул токен авторизации.'); return response.token;
}
function syncCurrentState(payload = {}) { if (Array.isArray(payload.lyrics)) state.lyrics = payload.lyrics; state.selectedIndex = Number.isInteger(payload.selectedLine) ? payload.selectedLine : state.selectedIndex; state.preferences.songName = payload.lyricsFileName || state.preferences.songName; renderLyrics(); }
function syncLyrics(payload) { if (Array.isArray(payload)) { state.lyrics = payload; state.selectedIndex = null; renderLyrics(); setMessage('Строки песни обновлены из LyricDisplay.', 'success'); } }
async function connect() {
  try {
    if (typeof io !== 'function') throw new Error('Клиент Socket.IO не загрузился. Проверьте распаковку программы.');
    const settings = currentSettings(); state.preferences = { ...state.preferences, ...settings }; await window.desktopApi.savePreferences(state.preferences);
    if (state.socket) state.socket.disconnect(); setConnected(false, 'Подключение…');
    const socket = io(settings.serverUrl, { auth: { token: await getToken(settings) }, transports: ['websocket', 'polling'], reconnection: true, timeout: 10000 });
    socket.on('connect', () => { state.socket = socket; setConnected(true, 'LyricDisplay подключён'); socket.emit('clientConnect', { type: 'web' }); socket.emit('requestCurrentState'); setMessage('Подключено. Добавьте или выберите песню в LyricDisplay.', 'success'); });
    socket.on('currentState', syncCurrentState); socket.on('serverLyricsLoad', syncLyrics); socket.on('lyricsLoad', syncLyrics);
    socket.on('serverLineUpdate', (payload) => { if (Number.isInteger(payload?.index)) { state.selectedIndex = payload.index; renderLyrics(); } });
    socket.on('disconnect', () => { setConnected(false, 'LyricDisplay не подключён'); state.socket = null; });
    socket.on('connect_error', (error) => setMessage(`Ошибка подключения: ${error.message}`, 'error'));
    el.settingsDialog.close();
  } catch (error) { setConnected(false, 'Не подключён'); setMessage(error.message, 'error'); }
}
async function testConnection() { try { await getToken(currentSettings()); setMessage('LyricDisplay доступен, код принят.', 'success'); } catch (error) { setMessage(`Проверка не пройдена: ${error.message}`, 'error'); } }
function pushLine(index) { if (!state.socket?.connected) { setMessage('Сначала подключитесь к LyricDisplay.', 'error'); return; } if (!state.lyrics[index]) return; state.socket.emit('lineUpdate', { index }); state.selectedIndex = index; state.listener.lastIndex = index; state.listener.lastAt = Date.now(); renderLyrics(); setMessage(`Показана строка ${index + 1} в LyricDisplay.`, 'success'); }
function tokens(value) { return normalize(value).split(' ').filter((token) => token.length >= 3); }
function findBestLine(transcript) {
  const spoken = normalize(transcript); const spokenTokens = tokens(spoken); if (!spokenTokens.length) return null;
  let best = null;
  state.lyrics.forEach((line, index) => {
    const text = normalize(lineText(line)); if (!text) return;
    const matches = spokenTokens.filter((token) => text.includes(token));
    const phraseBonus = spoken.length >= 8 && (text.includes(spoken) || spoken.includes(text)) ? 0.5 : 0;
    const score = Math.min(1, matches.length / Math.max(3, Math.min(spokenTokens.length, 6)) + phraseBonus);
    const forwardBonus = index >= Math.max(0, state.listener.lastIndex) ? 0.08 : 0;
    if (!best || score + forwardBonus > best.score) best = { index, score: Math.min(1, score + forwardBonus), text: lineText(line) };
  });
  return best && best.score >= 0.48 ? best : null;
}
async function handleSpeech(transcript, confidence = 0) {
  el.transcript.textContent = transcript || 'Здесь появится распознанная речь…'; const best = findBestLine(transcript); if (!best) return;
  const effective = confidence > 0 ? confidence * 100 : 78; el.match.textContent = `Строка ${best.index + 1} · ${Math.round(effective)}%`; state.listener.lastIndex = best.index; renderLyrics();
  if (state.listener.mode !== 'auto' || effective < state.listener.threshold) { setMessage(`Найдена строка ${best.index + 1}. Проверьте совпадение и нажмите «Показать».`, ''); return; }
  if (best.index === state.selectedIndex && Date.now() - state.listener.lastAt < 7000) return; pushLine(best.index);
}
function createRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition; if (!Recognition) throw new Error('Распознавание речи недоступно в этой версии Electron/Windows.');
  const recognition = new Recognition(); recognition.lang = 'ru-RU'; recognition.continuous = true; recognition.interimResults = true;
  recognition.onstart = () => { el.listenerStatus.textContent = 'Микрофон слушает'; };
  recognition.onresult = async (event) => { let text = ''; let confidence = 0; for (let index = event.resultIndex; index < event.results.length; index += 1) { text += `${event.results[index][0].transcript} `; if (event.results[index].isFinal) confidence = event.results[index][0].confidence || 0; } await handleSpeech(text.trim(), confidence); };
  recognition.onerror = (event) => { if (event.error !== 'no-speech') setMessage(`Ошибка микрофона: ${event.error}`, 'error'); };
  recognition.onend = () => { if (state.listener.active) window.setTimeout(() => state.listener.active && recognition.start(), 250); };
  return recognition;
}
async function toggleListener() {
  if (state.listener.active) { state.listener.active = false; state.listener.recognition?.stop(); el.listenerStatus.textContent = 'Остановлен'; el.listenerToggle.textContent = 'Начать слушать'; return; }
  try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); stream.getTracks().forEach((track) => track.stop()); state.listener.recognition = createRecognition(); state.listener.active = true; state.listener.recognition.start(); el.listenerToggle.textContent = 'Пауза слушателя'; setMessage('Слушатель включён. LyricDisplay будет переключаться по найденным словам.', 'success'); } catch (error) { setMessage(error.message, 'error'); }
}
el.settingsButton.addEventListener('click', () => el.settingsDialog.showModal()); el.settingsForm.addEventListener('submit', (event) => { event.preventDefault(); connect(); }); el.test.addEventListener('click', testConnection); el.refresh.addEventListener('click', () => state.socket?.emit('requestCurrentState')); el.listenerToggle.addEventListener('click', toggleListener);
el.mode.addEventListener('change', async () => { state.listener.mode = el.mode.value; await window.desktopApi.savePreferences({ ...state.preferences, listenerMode: state.listener.mode }); });
el.threshold.addEventListener('input', () => { state.listener.threshold = Number(el.threshold.value); el.thresholdValue.textContent = `${state.listener.threshold}%`; });
el.threshold.addEventListener('change', async () => window.desktopApi.savePreferences({ ...state.preferences, listenerThreshold: state.listener.threshold }));
(async function initialise() { const preferences = await window.desktopApi.loadPreferences(); state.preferences = { ...state.preferences, ...preferences }; el.serverUrl.value = state.preferences.serverUrl || 'http://localhost:4000'; el.joinCode.value = state.preferences.joinCode || ''; state.listener.mode = state.preferences.listenerMode === 'suggest' ? 'suggest' : 'auto'; state.listener.threshold = Number(state.preferences.listenerThreshold) || 78; el.mode.value = state.listener.mode; el.threshold.value = state.listener.threshold; el.thresholdValue.textContent = `${state.listener.threshold}%`; renderLyrics(); })();
