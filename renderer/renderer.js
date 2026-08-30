/* global io */

const state = {
  bible: null,
  preferences: { serverUrl: 'http://localhost:4000', joinCode: '' },
  result: null,
  socket: null,
  searchIndex: [],
  plan: [],
  language: 'ru',
  translationId: 'synodal',
  licenseVerified: false,
  listener: { active: false, recognition: null, lastKey: '', lastAt: 0, mode: 'auto', threshold: 78, transcript: '', selectedDeviceId: '', audioBackend: 'standard', asioDriver: '' },
};

const elements = {
  book: document.querySelector('#book-input'),
  chapter: document.querySelector('#chapter-input'),
  verse: document.querySelector('#verse-input'),
  bookList: document.querySelector('#book-list'),
  find: document.querySelector('#find-button'),
  resultCard: document.querySelector('#result-card'),
  referenceTitle: document.querySelector('#reference-title'),
  verseContent: document.querySelector('#verse-content'),
  message: document.querySelector('#message-box'),
  copy: document.querySelector('#copy-button'),
  output: document.querySelector('#output-button'),
  addToPlan: document.querySelector('#add-to-plan-button'),
  wordSearchInput: document.querySelector('#word-search-input'),
  wordSearchButton: document.querySelector('#word-search-button'),
  wordSearchCount: document.querySelector('#word-search-count'),
  wordResults: document.querySelector('#word-results'),
  planCount: document.querySelector('#plan-count'),
  planEmpty: document.querySelector('#plan-empty'),
  planList: document.querySelector('#plan-list'),
  databaseStat: document.querySelector('#database-stat'),
  connectionDot: document.querySelector('#connection-dot'),
  connectionLabel: document.querySelector('#connection-label'),
  settingsButton: document.querySelector('#settings-button'),
  settingsDialog: document.querySelector('#settings-dialog'),
  settingsForm: document.querySelector('#settings-form'),
  serverUrl: document.querySelector('#server-url-input'),
  joinCode: document.querySelector('#join-code-input'),
  readCode: document.querySelector('#read-code-button'),
  testConnection: document.querySelector('#test-connection-button'),
  languageSelect: document.querySelector('#language-select'),
  translationSynodal: document.querySelector('#translation-synodal'),
  translationModern: document.querySelector('#translation-modern'),
  licenseStatus: document.querySelector('#license-status'),
  licenseCheckButton: document.querySelector('#license-check-button'),
  listenerDot: document.querySelector('#listener-dot'),
  listenerStatus: document.querySelector('#listener-status'),
  listenerTranscript: document.querySelector('#listener-transcript'),
  listenerToggle: document.querySelector('#listener-toggle'),
  listenerMode: document.querySelector('#listener-mode'),
  listenerThreshold: document.querySelector('#listener-threshold'),
  listenerThresholdValue: document.querySelector('#listener-threshold-value'),
  listenerDetected: document.querySelector('#listener-detected'),
  microphoneSelect: document.querySelector('#microphone-select'),
  audioBackendSelect: document.querySelector('#audio-backend-select'), asioDriverSelect: document.querySelector('#asio-driver-select'),
  microphoneHelp: document.querySelector('#microphone-help'),
};

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[.,;()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanServerUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function showMessage(text, type = 'info') {
  elements.message.textContent = text;
  elements.message.className = `message message-${type}`;
}

const TRANSLATIONS = {
  synodal: { ru: 'Синодальный', en: 'Synodal', licenseRu: '✓ Public Domain', licenseEn: '✓ Public Domain', available: true },
  modern: { ru: 'Современный русский', en: 'Modern Russian', licenseRu: 'Требуется разрешение', licenseEn: 'Permission required', available: false },
};

const UI_COPY = {
  ru: { connection: 'Подключение', language: 'Язык', localEyebrow: 'ЛОКАЛЬНЫЙ ПОИСК И ВЫВОД', heroTitle: 'Найдите место — выведите его на экран', heroLead: 'Текст хранится внутри приложения. При выводе он передаётся только в запущенный на этом компьютере LyricDisplay.', translation: 'ПЕРЕВОД', licenseChecking: 'Лицензия проверяется…', check: 'Проверить', find: 'Найти', wordEyebrow: 'ПОИСК ПО СЛОВАМ', wordTitle: 'Найдите стих по фразе или слову', search: 'Искать слова', planEyebrow: 'ПЛАН ПОКАЗА', planTitle: 'Подготовленные места', output: 'Вывести', addPlan: '＋ В план' },
  en: { connection: 'Connect', language: 'Language', localEyebrow: 'LOCAL SEARCH & OUTPUT', heroTitle: 'Find a passage — put it on screen', heroLead: 'The text stays inside the app. When output, it is sent only to LyricDisplay running on this computer.', translation: 'TRANSLATION', licenseChecking: 'Checking license…', check: 'Check', find: 'Find', wordEyebrow: 'WORD SEARCH', wordTitle: 'Find a verse by phrase or word', search: 'Search words', planEyebrow: 'PRESENTATION PLAN', planTitle: 'Prepared passages', output: 'Output', addPlan: '＋ Plan' },
};

function applyLanguage(language) {
  state.language = language === 'en' ? 'en' : 'ru';
  const copy = UI_COPY[state.language];
  document.documentElement.lang = state.language;
  elements.languageSelect.value = state.language;
  elements.settingsButton.textContent = copy.connection;
  document.querySelector('.connection-area .language-control span').textContent = copy.language;
  document.querySelector('.hero .eyebrow').textContent = copy.localEyebrow;
  document.querySelector('.hero h2').textContent = copy.heroTitle;
  document.querySelector('.hero .lead').textContent = copy.heroLead;
  document.querySelector('.translation-label').textContent = copy.translation;
  document.querySelector('.word-search-panel .eyebrow').textContent = copy.wordEyebrow;
  document.querySelector('.word-search-panel h3').textContent = copy.wordTitle;
  elements.wordSearchButton.textContent = copy.search;
  document.querySelector('.plan-panel .eyebrow').textContent = copy.planEyebrow;
  document.querySelector('.plan-panel h3').textContent = copy.planTitle;
  elements.find.textContent = copy.find;
  elements.addToPlan.textContent = copy.addPlan;
  elements.output.textContent = state.result ? copy.output : copy.output;
  elements.licenseCheckButton.textContent = copy.check;
  updateLicenseStatus();
}

function updateLicenseStatus() {
  const translation = TRANSLATIONS[state.translationId];
  elements.licenseStatus.textContent = state.language === 'en' ? translation.licenseEn : translation.licenseRu;
  elements.licenseStatus.className = `license-status ${translation.available ? 'license-ok' : 'license-pending'}`;
  elements.translationSynodal.classList.toggle('is-active', state.translationId === 'synodal');
  elements.translationModern.classList.toggle('is-active', state.translationId === 'modern');
}

function checkLicense() {
  state.licenseVerified = state.translationId === 'synodal';
  updateLicenseStatus();
  showMessage(state.licenseVerified ? (state.language === 'en' ? 'License verified: Public Domain.' : 'Лицензия проверена: общественное достояние.') : (state.language === 'en' ? 'The Modern Russian translation requires permission and is not embedded.' : 'Современный русский перевод требует разрешения и не встроен в приложение.'), state.licenseVerified ? 'success' : 'info');
}

function selectTranslation(id) {
  state.translationId = id;
  updateLicenseStatus();
  if (id === 'modern') {
    showMessage(state.language === 'en' ? 'This translation is not embedded yet. Add a licensed file to enable it.' : 'Этот перевод пока не встроен. Для включения добавьте лицензированный файл.', 'info');
    return;
  }
  checkLicense();
}

function setConnection(connected, label) {
  elements.connectionDot.className = `status-dot ${connected ? 'status-online' : 'status-offline'}`;
  elements.connectionLabel.textContent = label;
}

async function refreshMicrophones({ requestPermission = false } = {}) {
  if (!navigator.mediaDevices?.enumerateDevices) return;
  if (requestPermission && navigator.mediaDevices.getUserMedia) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  const microphones = devices.filter((device) => device.kind === 'audioinput');
  elements.microphoneSelect.replaceChildren();
  if (!microphones.length) {
    const option = document.createElement('option'); option.value = ''; option.textContent = 'Микрофон не найден'; elements.microphoneSelect.appendChild(option); return;
  }
  microphones.forEach((device, index) => {
    const option = document.createElement('option'); option.value = device.deviceId; option.textContent = device.label || `Микрофон ${index + 1}`; elements.microphoneSelect.appendChild(option);
  });
  const available = microphones.some((device) => device.deviceId === state.listener.selectedDeviceId);
  state.listener.selectedDeviceId = available ? state.listener.selectedDeviceId : microphones[0].deviceId;
  elements.microphoneSelect.value = state.listener.selectedDeviceId;
}

function selectedAudioConstraints() {
  if (state.listener.audioBackend === 'asio') {
    showMessage('ASIO bridge ещё не установлен в этой сборке. Используется выбранный микрофон Windows audio.', 'info');
  }
  return state.listener.selectedDeviceId ? { deviceId: { exact: state.listener.selectedDeviceId } } : true;
}

function setListenerStatus(active, text) {
  elements.listenerDot.className = `status-dot ${active ? 'status-online' : 'status-offline'}`;
  elements.listenerStatus.textContent = text;
}

function updateListenerControls() {
  elements.listenerMode.value = state.listener.mode;
  elements.listenerThreshold.value = String(state.listener.threshold);
  elements.listenerThresholdValue.textContent = `${state.listener.threshold}%`;
  elements.listenerToggle.textContent = state.listener.active ? 'Пауза слушателя' : 'Начать слушать';
  elements.listenerToggle.classList.toggle('button-output', !state.listener.active);
  elements.listenerToggle.classList.toggle('button-secondary', state.listener.active);
}

function setBusy(button, busy, busyLabel) {
  if (busy) {
    button.dataset.originalLabel = button.textContent;
    button.textContent = busyLabel;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalLabel || button.textContent;
    button.disabled = false;
  }
}

function displayBookName(book) {
  const replacements = {
    'От Матфея': 'Матфея',
    'От Марка': 'Марка',
    'От Луки': 'Луки',
    'От Иоанна': 'Иоанна',
    'К Римлянам': 'Римлянам',
    'К Галатам': 'Галатам',
    'К Ефесянам': 'Ефесянам',
    'К Филиппийцам': 'Филиппийцам',
    'К Колоссянам': 'Колоссянам',
    'К Титу': 'Титу',
    'К Филимону': 'Филимону',
    'К Евреям': 'Евреям',
  };
  return replacements[book.name] || book.name;
}

function resolveBook(value) {
  const needle = normalize(value);
  if (!needle) return null;

  const candidates = state.bible.books.map((book) => ({
    book,
    names: [book.name, displayBookName(book), ...(book.aliases || [])].map(normalize),
  }));

  for (const candidate of candidates) {
    if (candidate.names.includes(needle)) return candidate.book;
  }
  for (const candidate of candidates) {
    if (candidate.names.some((name) => name.startsWith(needle) || needle.startsWith(name))) return candidate.book;
  }
  return null;
}

function parseReference() {
  const rawBook = elements.book.value.trim();
  const directMatch = rawBook.match(/^(.+?)\s+(\d+)\s*[:.]\s*(\d+(?:\s*[–—-]\s*\d+)?)\s*$/u);

  if (directMatch) {
    elements.book.value = directMatch[1].trim();
    elements.chapter.value = directMatch[2];
    elements.verse.value = directMatch[3].replace(/[–—]/g, '-').replace(/\s/g, '');
  }

  const book = resolveBook(elements.book.value);
  const chapterNumber = Number(elements.chapter.value);
  const rangeMatch = String(elements.verse.value).trim().replace(/[–—]/g, '-').match(/^(\d+)(?:\s*-\s*(\d+))?$/);

  if (!book) throw new Error('Книга не найдена. Выберите её из списка или используйте известное сокращение, например «Ин».');
  if (!Number.isInteger(chapterNumber) || chapterNumber < 1 || chapterNumber > book.chapters.length) {
    throw new Error(`Укажите главу от 1 до ${book.chapters.length} для книги «${displayBookName(book)}».`);
  }
  if (!rangeMatch) throw new Error('Укажите номер стиха или диапазон, например «16» либо «16-18».');

  const firstVerse = Number(rangeMatch[1]);
  const lastVerse = Number(rangeMatch[2] || rangeMatch[1]);
  const chapter = book.chapters[chapterNumber - 1];
  if (firstVerse < 1 || lastVerse < firstVerse || lastVerse > chapter.length) {
    throw new Error(`В ${displayBookName(book)} ${chapterNumber} доступно стихов: 1–${chapter.length}.`);
  }

  return {
    book,
    chapterNumber,
    firstVerse,
    lastVerse,
    verses: chapter.slice(firstVerse - 1, lastVerse).map((text, index) => ({ number: firstVerse + index, text })),
  };
}

function resultReference(result) {
  const range = result.firstVerse === result.lastVerse
    ? String(result.firstVerse)
    : `${result.firstVerse}–${result.lastVerse}`;
  return `${displayBookName(result.book)} ${result.chapterNumber}:${range}`;
}

function bookById(id) {
  return state.bible.books.find((book) => book.id === id) || null;
}

function resultFromPosition(position) {
  const book = bookById(position.bookId);
  if (!book) return null;
  const chapter = book.chapters[position.chapterNumber - 1];
  if (!chapter || position.firstVerse < 1 || position.lastVerse > chapter.length) return null;
  return {
    book,
    chapterNumber: position.chapterNumber,
    firstVerse: position.firstVerse,
    lastVerse: position.lastVerse,
    verses: chapter.slice(position.firstVerse - 1, position.lastVerse).map((text, index) => ({ number: position.firstVerse + index, text })),
  };
}

function serialiseResult(result) {
  return {
    bookId: result.book.id,
    chapterNumber: result.chapterNumber,
    firstVerse: result.firstVerse,
    lastVerse: result.lastVerse,
  };
}

function planKey(result) {
  return `${result.book.id}:${result.chapterNumber}:${result.firstVerse}-${result.lastVerse}`;
}

async function savePlan() {
  state.preferences = { ...state.preferences, plan: state.plan };
  await window.desktopApi.savePreferences(state.preferences);
}

function renderPlan() {
  elements.planList.replaceChildren();
  elements.planCount.textContent = `${state.plan.length} ${state.plan.length === 1 ? 'место' : 'мест'}`;
  elements.planEmpty.classList.toggle('is-hidden', state.plan.length > 0);

  state.plan.forEach((item, index) => {
    const result = resultFromPosition(item);
    if (!result) return;
    const row = document.createElement('div');
    row.className = 'plan-row';
    const number = document.createElement('span');
    number.className = 'plan-number';
    number.textContent = String(index + 1).padStart(2, '0');
    const info = document.createElement('div');
    info.className = 'plan-info';
    const title = document.createElement('strong');
    title.textContent = resultReference(result);
    const preview = document.createElement('span');
    preview.textContent = result.verses[0]?.text || '';
    info.append(title, preview);
    const actions = document.createElement('div');
    actions.className = 'plan-actions';
    const output = document.createElement('button');
    output.className = 'button button-output button-small';
    output.type = 'button';
    output.textContent = 'Вывести';
    output.addEventListener('click', () => outputPlanResult(result));
    const remove = document.createElement('button');
    remove.className = 'icon-button';
    remove.type = 'button';
    remove.title = 'Удалить из плана';
    remove.textContent = '×';
    remove.addEventListener('click', async () => {
      state.plan.splice(index, 1);
      renderPlan();
      await savePlan();
      showMessage('Место удалено из плана.', 'info');
    });
    actions.append(output, remove);
    row.append(number, info, actions);
    elements.planList.appendChild(row);
  });
}

async function addResultToPlan(result, quiet = false) {
  const key = planKey(result);
  if (state.plan.some((item) => planKey({ book: bookById(item.bookId), chapterNumber: item.chapterNumber, firstVerse: item.firstVerse, lastVerse: item.lastVerse }) === key)) {
    if (!quiet) showMessage('Это место уже есть в плане.', 'info');
    return;
  }
  state.plan.push(serialiseResult(result));
  renderPlan();
  await savePlan();
  if (!quiet) showMessage(`${resultReference(result)} добавлено в план показа.`, 'success');
}

function renderWordResults(results, query) {
  elements.wordResults.replaceChildren();
  if (!results.length) {
    const empty = document.createElement('div');
    empty.className = 'search-empty';
    empty.textContent = `По запросу «${query}» ничего не найдено.`;
    elements.wordResults.appendChild(empty);
    elements.wordSearchCount.textContent = 'Ничего не найдено';
    return;
  }
  elements.wordSearchCount.textContent = `${results.length}${results.length === 100 ? '+' : ''} результатов`;
  results.forEach((entry) => {
    const row = document.createElement('div');
    row.className = 'word-result-row';
    const textWrap = document.createElement('button');
    textWrap.className = 'word-result-text';
    textWrap.type = 'button';
    textWrap.title = 'Открыть результат';
    const heading = document.createElement('strong');
    heading.textContent = `${displayBookName(entry.book)} ${entry.chapterNumber}:${entry.verseNumber}`;
    const excerpt = document.createElement('span');
    excerpt.textContent = entry.text;
    textWrap.append(heading, excerpt);
    textWrap.addEventListener('click', () => {
      const result = resultFromPosition({ bookId: entry.book.id, chapterNumber: entry.chapterNumber, firstVerse: entry.verseNumber, lastVerse: entry.verseNumber });
      if (result) renderResult(result);
    });
    const output = document.createElement('button');
    output.className = 'button button-output button-small';
    output.type = 'button';
    output.textContent = 'Вывести';
    output.addEventListener('click', async () => {
      const result = resultFromPosition({ bookId: entry.book.id, chapterNumber: entry.chapterNumber, firstVerse: entry.verseNumber, lastVerse: entry.verseNumber });
      if (result) await outputPlanResult(result);
    });
    const add = document.createElement('button');
    add.className = 'button button-secondary button-small';
    add.type = 'button';
    add.textContent = '＋ В план';
    add.addEventListener('click', async () => {
      const result = resultFromPosition({ bookId: entry.book.id, chapterNumber: entry.chapterNumber, firstVerse: entry.verseNumber, lastVerse: entry.verseNumber });
      if (result) await addResultToPlan(result);
    });
    row.append(textWrap, output, add);
    elements.wordResults.appendChild(row);
  });
}

function parseSpokenReference(transcript) {
  const source = String(transcript || '').replace(/[.,;!?]/g, ' ').replace(/\s+/g, ' ').trim();
  const patterns = [
    /^(.+?)\s+(\d+)\s*(?::|глава\s+)(\d+)(?:\s*(?:-|до)\s*(\d+))?/iu,
    /^(.+?)\s+глава\s+(\d+)\s+стих(?:а)?\s+(\d+)(?:\s*(?:-|до|по)\s*(\d+))?/iu,
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (!match) continue;
    const book = resolveBook(match[1]);
    if (!book) continue;
    const result = resultFromPosition({ bookId: book.id, chapterNumber: Number(match[2]), firstVerse: Number(match[3]), lastVerse: Number(match[4] || match[3]) });
    if (result) return result;
  }
  return null;
}

async function handleListenerResult(transcript, confidence = 0) {
  state.listener.transcript = transcript;
  elements.listenerTranscript.textContent = transcript || 'Здесь появится распознанная речь…';
  const result = parseSpokenReference(transcript);
  if (!result) return;
  const key = planKey(result);
  const effectiveConfidence = confidence > 0 ? confidence * 100 : 78;
  elements.listenerDetected.textContent = `${resultReference(result)} · ${Math.round(effectiveConfidence)}%`;
  if (state.listener.mode !== 'auto' || effectiveConfidence < state.listener.threshold) {
    renderResult(result);
    showMessage(`Найдено в речи: ${resultReference(result)}. Проверьте место и нажмите «Вывести».`, 'info');
    return;
  }
  const now = Date.now();
  if (state.listener.lastKey === key && now - state.listener.lastAt < 10000) return;
  state.listener.lastKey = key;
  state.listener.lastAt = now;
  state.result = result;
  renderResult(result);
  await outputToLyricDisplay();
  showMessage(`Автоматически выведено: ${resultReference(result)}.`, 'success');
}

function createSpeechRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) throw new Error('Распознавание речи недоступно в этой версии Windows/Electron.');
  const recognition = new Recognition();
  recognition.lang = 'ru-RU';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.onstart = () => setListenerStatus(true, 'Микрофон слушает');
  recognition.onresult = async (event) => {
    let transcript = '';
    let confidence = 0;
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      transcript += event.results[index][0].transcript;
      if (event.results[index].isFinal) confidence = event.results[index][0].confidence || 0;
    }
    await handleListenerResult(transcript, confidence);
  };
  recognition.onerror = (event) => {
    if (event.error === 'not-allowed') showMessage('Доступ к микрофону запрещён. Разрешите микрофон для Bible Lookup в Windows.', 'error');
    else if (event.error !== 'no-speech') showMessage(`Слушатель: ${event.error}`, 'error');
    setListenerStatus(false, 'Ошибка микрофона');
  };
  recognition.onend = () => {
    if (!state.listener.active) { setListenerStatus(false, 'Слушатель выключен'); return; }
    window.setTimeout(() => { if (state.listener.active) recognition.start(); }, 250);
  };
  return recognition;
}

async function toggleListener() {
  if (state.listener.active) {
    state.listener.active = false;
    state.listener.recognition?.stop();
    setListenerStatus(false, 'Слушатель выключен');
    updateListenerControls();
    return;
  }
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Windows не предоставил доступ к микрофону этому приложению.');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: selectedAudioConstraints() });
    stream.getTracks().forEach((track) => track.stop());
    state.preferences = { ...state.preferences, microphoneDeviceId: state.listener.selectedDeviceId, audioBackend: state.listener.audioBackend };
    await window.desktopApi.savePreferences(state.preferences);
    state.listener.recognition = createSpeechRecognition();
    state.listener.active = true;
    state.listener.recognition.start();
    updateListenerControls();
    showMessage('Слушатель включён. Говорите ссылку на место Писания.', 'success');
  } catch (error) {
    state.listener.active = false;
    updateListenerControls();
    showMessage(error.message || 'Не удалось получить доступ к микрофону.', 'error');
  }
}

function searchWords() {
  const query = normalize(elements.wordSearchInput.value);
  const words = query.split(' ').filter((word) => word.length > 1);
  if (!words.length) {
    elements.wordResults.replaceChildren();
    elements.wordSearchCount.textContent = 'Поиск по всей Библии';
    showMessage('Введите одно или несколько слов для поиска.', 'info');
    return;
  }
  const results = state.searchIndex.filter((entry) => words.every((word) => entry.normalizedText.includes(word))).slice(0, 100);
  renderWordResults(results, query);
  showMessage(results.length ? `Поиск завершён: найдено ${results.length}${results.length === 100 ? '+' : ''} результатов.` : `По запросу «${query}» совпадений нет.`, results.length ? 'success' : 'info');
}

async function outputPlanResult(result) {
  state.result = result;
  renderResult(result);
  await outputToLyricDisplay();
}

function renderResult(result) {
  state.result = result;
  const reference = resultReference(result);
  elements.referenceTitle.textContent = reference;
  elements.verseContent.replaceChildren();

  for (const verse of result.verses) {
    const paragraph = document.createElement('p');
    const number = document.createElement('sup');
    number.textContent = verse.number;
    paragraph.append(number, document.createTextNode(verse.text));
    elements.verseContent.appendChild(paragraph);
  }

  elements.resultCard.classList.remove('is-hidden');
  showMessage(`Найдено: ${reference}. Проверьте текст и нажмите «Вывести в LyricDisplay».`, 'success');
}

function findReference() {
  try {
    renderResult(parseReference());
  } catch (error) {
    state.result = null;
    elements.resultCard.classList.add('is-hidden');
    showMessage(error.message, 'error');
  }
}

function resultPlainText() {
  const reference = resultReference(state.result);
  const body = state.result.verses
    .map((verse) => (state.result.verses.length === 1 ? verse.text : `${verse.number}. ${verse.text}`))
    .join('\n');
  return `${reference}\n${body}`;
}

async function copyResult() {
  if (!state.result) return;
  try {
    await navigator.clipboard.writeText(resultPlainText());
    showMessage('Ссылка и текст скопированы в буфер обмена.', 'success');
  } catch {
    showMessage('Не удалось скопировать текст. Вы можете выделить его вручную.', 'error');
  }
}

function currentSettings() {
  return {
    serverUrl: cleanServerUrl(elements.serverUrl.value || state.preferences.serverUrl || 'http://localhost:4000'),
    joinCode: String(elements.joinCode.value || '').replace(/\D/g, '').slice(0, 6),
  };
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  let data = null;
  try { data = await response.json(); } catch { /* no JSON body */ }
  if (!response.ok) {
    const detail = data?.error || data?.message || `HTTP ${response.status}`;
    throw new Error(detail);
  }
  return data;
}

async function requestToken(settings) {
  if (!settings.serverUrl) throw new Error('Укажите адрес LyricDisplay. Обычно это http://localhost:4000.');
  if (!/^https?:\/\//i.test(settings.serverUrl)) throw new Error('Адрес должен начинаться с http:// или https://.');
  if (!/^\d{6}$/.test(settings.joinCode)) throw new Error('Укажите 6-значный код подключения LyricDisplay.');

  await fetchJson(`${settings.serverUrl}/api/health`);
  const tokenResponse = await fetchJson(`${settings.serverUrl}/api/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientType: 'web',
      deviceId: 'bible-lookup-lyricdisplay',
      sessionId: `bible-${Date.now()}`,
      joinCode: settings.joinCode,
    }),
  });
  if (!tokenResponse?.token) throw new Error('LyricDisplay не вернул код авторизации. Проверьте код подключения.');
  return tokenResponse.token;
}

function closeSocket() {
  if (state.socket) {
    state.socket.removeAllListeners();
    state.socket.disconnect();
    state.socket = null;
  }
}

async function connectToLyricDisplay(settings) {
  closeSocket();
  setConnection(false, 'Подключение к LyricDisplay…');
  const token = await requestToken(settings);

  const socket = io(settings.serverUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: false,
    timeout: 10000,
  });

  await new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('LyricDisplay не ответил в течение 10 секунд.')), 10500);
    socket.once('connect', () => {
      window.clearTimeout(timer);
      resolve();
    });
    socket.once('connect_error', (error) => {
      window.clearTimeout(timer);
      reject(new Error(error?.message || 'Не удалось открыть соединение с LyricDisplay.'));
    });
  });

  socket.emit('clientConnect', { type: 'web' });
  socket.on('disconnect', () => setConnection(false, 'LyricDisplay не подключён'));
  socket.on('connect_error', () => setConnection(false, 'Ошибка подключения к LyricDisplay'));
  socket.on('permissionError', (payload) => {
    const message = payload?.message || 'LyricDisplay отклонил команду: недостаточно разрешений.';
    showMessage(message, 'error');
  });
  socket.on('authError', (payload) => {
    const message = payload?.message || 'Авторизация LyricDisplay завершилась ошибкой. Обновите код подключения.';
    showMessage(message, 'error');
  });

  state.socket = socket;
  setConnection(true, 'LyricDisplay подключён');
  return socket;
}

async function saveAndConnect({ closeDialog = true } = {}) {
  const settings = currentSettings();
  state.preferences = settings;
  await window.desktopApi.savePreferences(settings);
  elements.serverUrl.value = settings.serverUrl;
  elements.joinCode.value = settings.joinCode;

  const socket = await connectToLyricDisplay(settings);
  showMessage('Подключение к LyricDisplay установлено.', 'success');
  if (closeDialog) elements.settingsDialog.close();
  return socket;
}

async function readJoinCode() {
  const serverUrl = cleanServerUrl(elements.serverUrl.value || state.preferences.serverUrl);
  if (!serverUrl) {
    showMessage('Сначала укажите адрес LyricDisplay.', 'error');
    return;
  }
  setBusy(elements.readCode, true, 'Получаю…');
  try {
    const data = await fetchJson(`${serverUrl}/api/auth/join-code`);
    if (!/^\d{6}$/.test(String(data?.joinCode || ''))) {
      throw new Error('LyricDisplay не предоставил код. Откройте Tools → Connect Mobile Controller и введите код вручную.');
    }
    elements.joinCode.value = data.joinCode;
    showMessage('Код подключения получен. Нажмите «Сохранить и подключить».', 'success');
  } catch (error) {
    showMessage(`Не удалось получить код: ${error.message}`, 'error');
  } finally {
    setBusy(elements.readCode, false);
  }
}

async function testConnection() {
  setBusy(elements.testConnection, true, 'Проверяю…');
  try {
    const settings = currentSettings();
    await requestToken(settings);
    showMessage('LyricDisplay доступен, а код подключения принят.', 'success');
  } catch (error) {
    setConnection(false, 'LyricDisplay не подключён');
    showMessage(`Проверка не пройдена: ${error.message}`, 'error');
  } finally {
    setBusy(elements.testConnection, false);
  }
}

async function outputToLyricDisplay() {
  if (!state.result) return;
  setBusy(elements.output, true, 'Вывожу…');
  try {
    let socket = state.socket;
    if (!socket?.connected) socket = await saveAndConnect({ closeDialog: false });

    const reference = resultReference(state.result);
    const verses = state.result.verses;
    const displayLines = verses.length === 1
      ? [{ line1: reference, line2: verses[0].text }]
      : Array.from({ length: Math.ceil(verses.length / 2) }, (_, pairIndex) => {
        const first = verses[pairIndex * 2];
        const second = verses[pairIndex * 2 + 1];
        return {
          line1: `${first.number}. ${first.text}`,
          line2: second ? `${second.number}. ${second.text}` : reference,
        };
      });
    const lyrics = displayLines.map((displayLine, index) => {
      const displayText = `${displayLine.line1}\n${displayLine.line2}`;
      return {
        type: 'normal-group',
        id: `bible-${state.result.book.id}-${state.result.chapterNumber}-${state.result.firstVerse}-${state.result.lastVerse}-${index}`,
        line1: displayLine.line1,
        line2: displayLine.line2,
        displayText,
        searchText: `${reference}\n${displayText}`,
        originalIndex: index,
      };
    });
    const rawLyricsContent = lyrics.map((line) => line.displayText).join('\n\n');

    socket.emit('lyricsLoad', {
      lyrics,
      fileName: `${reference}.txt`,
      rawLyricsContent,
      lyricsSource: { content: rawLyricsContent, fileType: 'txt', filePath: null, fileName: `${reference}.txt` },
    });
    socket.emit('lineUpdate', { index: 0 });
    socket.emit('outputToggle', true);

    showMessage(`${reference} загружено в LyricDisplay, выбрано и выведено на активные Output и Stage.`, 'success');
  } catch (error) {
    setConnection(false, 'LyricDisplay не подключён');
    showMessage(`Не удалось вывести текст: ${error.message}`, 'error');
  } finally {
    setBusy(elements.output, false);
  }
}

async function initialise() {
  try {
    const [bible, preferences] = await Promise.all([
      window.desktopApi.loadBible(),
      window.desktopApi.loadPreferences(),
    ]);
    state.bible = bible;
    state.preferences = { ...state.preferences, ...preferences };
    state.language = state.preferences.language === 'en' ? 'en' : 'ru';
    state.listener.mode = state.preferences.listenerMode === 'suggest' ? 'suggest' : 'auto';
    state.listener.threshold = Number(state.preferences.listenerThreshold) || 78;
    state.listener.selectedDeviceId = state.preferences.microphoneDeviceId || '';
    state.listener.audioBackend = state.preferences.audioBackend === 'asio' ? 'asio' : 'standard'; state.listener.asioDriver = state.preferences.asioDriver || '';
    state.plan = Array.isArray(state.preferences.plan) ? state.preferences.plan.filter((item) => resultFromPosition(item)) : [];
    state.searchIndex = [];
    bible.books.forEach((book) => {
      book.chapters.forEach((chapter, chapterIndex) => {
        chapter.forEach((text, verseIndex) => {
          state.searchIndex.push({
            book,
            chapterNumber: chapterIndex + 1,
            verseNumber: verseIndex + 1,
            text,
            normalizedText: normalize(text),
          });
        });
      });
    });
    elements.serverUrl.value = state.preferences.serverUrl;
    elements.joinCode.value = state.preferences.joinCode;
    elements.databaseStat.textContent = `${bible.bookCount} книг · ${bible.verseCount.toLocaleString('ru-RU')} стихов`;

    for (const book of bible.books) {
      const option = document.createElement('option');
      option.value = displayBookName(book);
      elements.bookList.appendChild(option);
    }
    renderPlan();
    applyLanguage(state.language);
    checkLicense();
    updateListenerControls();
    elements.audioBackendSelect.value = state.listener.audioBackend;
    try { const asio = await window.desktopApi.getAsioStatus(); const option = elements.audioBackendSelect.querySelector('option[value="asio"]'); if (option) option.textContent = asio.available ? `ASIO bridge (${asio.devices.length} устройств)` : 'ASIO bridge (не найден)'; } catch { /* optional native bridge */ }
    try { await refreshMicrophones(); } catch (error) { if (elements.microphoneHelp) elements.microphoneHelp.textContent = `Разрешите доступ к микрофону перед выбором устройства. ${error.message || ''}`; }
    navigator.mediaDevices?.addEventListener('devicechange', () => refreshMicrophones().catch(() => {}));
    setListenerStatus(false, 'Слушатель выключен');
    showMessage(state.language === 'en' ? 'Synodal Bible database is ready. Start with a reference such as “John 3:16”.' : 'База Синодального перевода готова к поиску. Начните с ссылки, например «Иоанна 3:16».');
  } catch (error) {
    showMessage(`Не удалось загрузить офлайн-базу: ${error.message}`, 'error');
  }
}

elements.find.addEventListener('click', findReference);
for (const input of [elements.book, elements.chapter, elements.verse]) {
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      findReference();
    }
  });
}
elements.languageSelect.addEventListener('change', async () => {
  applyLanguage(elements.languageSelect.value);
  state.preferences = { ...state.preferences, language: state.language };
  await window.desktopApi.savePreferences(state.preferences);
});
elements.translationSynodal.addEventListener('click', () => selectTranslation('synodal'));
elements.translationModern.addEventListener('click', () => selectTranslation('modern'));
elements.licenseCheckButton.addEventListener('click', checkLicense);
elements.listenerToggle.addEventListener('click', toggleListener);
elements.microphoneSelect?.addEventListener('change', async () => { state.listener.selectedDeviceId = elements.microphoneSelect.value; state.preferences = { ...state.preferences, microphoneDeviceId: state.listener.selectedDeviceId }; await window.desktopApi.savePreferences(state.preferences); if (state.listener.active) { state.listener.active = false; state.listener.recognition?.stop(); updateListenerControls(); setListenerStatus(false, 'Микрофон изменён — нажмите «Начать слушать»'); } });
elements.microphoneSelect?.addEventListener('focus', () => refreshMicrophones({ requestPermission: true }).catch(() => {}));
elements.audioBackendSelect?.addEventListener('change', async () => { state.listener.audioBackend = elements.audioBackendSelect.value === 'asio' ? 'asio' : 'standard'; state.preferences = { ...state.preferences, audioBackend: state.listener.audioBackend }; await window.desktopApi.savePreferences(state.preferences); if (state.listener.audioBackend === 'asio') showMessage('ASIO bridge будет использоваться после установки нативного модуля; сейчас выбранный микрофон работает через Windows audio.', 'info'); });
elements.listenerMode.addEventListener('change', async () => { state.listener.mode = elements.listenerMode.value; state.preferences = { ...state.preferences, listenerMode: state.listener.mode }; await window.desktopApi.savePreferences(state.preferences); });
elements.listenerThreshold.addEventListener('input', () => { state.listener.threshold = Number(elements.listenerThreshold.value); elements.listenerThresholdValue.textContent = `${state.listener.threshold}%`; });
elements.listenerThreshold.addEventListener('change', async () => { state.preferences = { ...state.preferences, listenerThreshold: state.listener.threshold }; await window.desktopApi.savePreferences(state.preferences); });
elements.copy.addEventListener('click', copyResult);
elements.addToPlan.addEventListener('click', () => state.result && addResultToPlan(state.result));
elements.output.addEventListener('click', outputToLyricDisplay);
elements.wordSearchButton.addEventListener('click', searchWords);
elements.wordSearchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    searchWords();
  }
});
elements.settingsButton.addEventListener('click', () => elements.settingsDialog.showModal());
elements.readCode.addEventListener('click', readJoinCode);
elements.testConnection.addEventListener('click', testConnection);
elements.settingsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submitter = event.submitter;
  if (submitter?.value === 'cancel') {
    elements.settingsDialog.close();
    return;
  }
  setBusy(document.querySelector('#save-settings-button'), true, 'Подключаю…');
  try {
    await saveAndConnect();
  } catch (error) {
    setConnection(false, 'LyricDisplay не подключён');
    showMessage(`Подключение не установлено: ${error.message}`, 'error');
  } finally {
    setBusy(document.querySelector('#save-settings-button'), false);
  }
});
document.querySelectorAll('.quick-reference').forEach((button) => {
  button.addEventListener('click', () => {
    elements.book.value = button.dataset.reference;
    elements.chapter.value = '';
    elements.verse.value = '';
    findReference();
  });
});

initialise();
