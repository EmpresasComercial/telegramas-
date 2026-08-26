/**
 * Gera um identificador único para o dispositivo/navegador.
 * Tenta ser o mais persistente possível.
 */
export const getDeviceId = (): string => {
  const storageKey = 'mcn_device_id';
  let deviceId = localStorage.getItem(storageKey);

  if (!deviceId) {
    // Gerar um ID baseado em características do browser + random
    const platform = navigator.platform || 'unknown';
    const screenRes = `${window.screen.width}x${window.screen.height}`;
    const randomPart = Math.random().toString(36).substring(2, 15);
    const timestamp = Date.now().toString(36);
    
    deviceId = `dev_${platform}_${screenRes}_${timestamp}_${randomPart}`.replace(/\s+/g, '_');
    localStorage.setItem(storageKey, deviceId);
  }

  return deviceId;
};
