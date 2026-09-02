(() => {
  const describeError = (error) => {
    const code = error?.name || 'UnknownError';
    const details = error?.message || 'без дополнительного описания';
    const hints = {
      NotAllowedError: 'Разрешите доступ к микрофону в параметрах конфиденциальности Windows и перезапустите программу.',
      NotFoundError: 'Windows не видит аудиовход. Проверьте USB/X AIR, кабель и настройки звука.',
      OverconstrainedError: 'Сохранённое устройство отключено. Выберите микрофон заново.',
      NotSupportedError: 'Запустите последнюю Windows-сборку приложения, а не HTML-файл.',
    };
    return `Ошибка микрофона (${code}): ${details}. ${hints[code] || 'Проверьте, не занят ли вход другой программой.'}`;
  };
  const enumerate = async ({ requestPermission = false } = {}) => {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    if (requestPermission && navigator.mediaDevices.getUserMedia) { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); stream.getTracks().forEach((track) => track.stop()); }
    return (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === 'audioinput');
  };
  window.lyricDisplayMicrophone = { describeError, enumerate };
})();
