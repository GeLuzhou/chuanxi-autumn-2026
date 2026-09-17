export const DEVICE_CONFIG_FORMAT = "chuanxi-amap-device-v1";
export const DEVICE_CONFIG_STORAGE = "chuanxi-amap-device-config-v1";
export const MAX_CONFIG_BYTES = 8192;
export type DeviceMapConfig = { format: typeof DEVICE_CONFIG_FORMAT; key: string; securityJsCode: string };

export function parseDeviceMapConfig(text: string): DeviceMapConfig {
  const invalid = () => new Error("这不是有效的地图配置文件，请选择「川西地图本机配置.json」。");
  if (text.length > MAX_CONFIG_BYTES) throw invalid();
  let value: unknown;
  try { value = JSON.parse(text.replace(/^\uFEFF/, "")); } catch { throw invalid(); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid();
  const input = value as Record<string, unknown>;
  const validKey = (key: unknown): key is string => typeof key === "string" && /^[a-f0-9]{32}$/i.test(key);
  if (input.format !== DEVICE_CONFIG_FORMAT || !validKey(input.key) || !validKey(input.securityJsCode)) throw invalid();
  // Copy only credentials; imported files cannot choose script URLs or a proxy host.
  return { format: DEVICE_CONFIG_FORMAT, key: input.key, securityJsCode: input.securityJsCode };
}

export function readDeviceMapConfig(): DeviceMapConfig | null {
  try {
    const text = window.localStorage.getItem(DEVICE_CONFIG_STORAGE);
    return text ? parseDeviceMapConfig(text) : null;
  } catch { return null; }
}

export function saveDeviceMapConfig(text: string): void {
  const config = parseDeviceMapConfig(text);
  try { window.localStorage.setItem(DEVICE_CONFIG_STORAGE, JSON.stringify(config)); }
  catch { throw new Error("浏览器无法保存配置，请允许网站存储后重试。"); }
}

export function clearDeviceMapConfig(): void {
  try { window.localStorage.removeItem(DEVICE_CONFIG_STORAGE); }
  catch { throw new Error("暂时无法清除配置，请在浏览器设置中清除本站数据。"); }
}
