import * as fs from 'fs';
import * as path from 'path';
import type { GlobalSettings } from './settingsService.js';

/**
 * Bridges launcher settings into the file the companion Fabric mod reads at
 * runtime (`config/gravity-client-core.json`). Without this the Mod-Menu and FPS
 * screens would only ever change launcher-local state.
 *
 * Keys the launcher does not own (theme, keybinds, anything a config preset
 * added) are preserved so presets and launcher settings can coexist.
 */

export const CLIENT_CORE_CONFIG_FILE = 'gravity-client-core.json';

export type HudPosition = 'TOP_LEFT' | 'TOP_RIGHT' | 'BOTTOM_LEFT' | 'BOTTOM_RIGHT';

export interface ClientCoreFpsConfig {
  position: HudPosition;
  textColor: string;
  useCustomTextColor: boolean;
  background: string;
  showBackground: boolean;
  backgroundOpacity: number;
  fontSize: number;
  showAverage: boolean;
}

export interface ClientCoreConfigFile {
  theme: string;
  enableBranding: boolean;
  enableCustomMainMenu: boolean;
  debugOverlay: boolean;
  renderFpsOnHUD: boolean;
  enabledMods: string[];
  fps: ClientCoreFpsConfig;
  [key: string]: unknown;
}

const POSITIONS: Record<string, HudPosition> = {
  'top left': 'TOP_LEFT',
  'top right': 'TOP_RIGHT',
  'bottom left': 'BOTTOM_LEFT',
  'bottom right': 'BOTTOM_RIGHT',
};

function toHudPosition(value: string | undefined): HudPosition {
  return POSITIONS[String(value ?? '').trim().toLowerCase()] ?? 'TOP_LEFT';
}

/** Normalises "#abc" / "abc123" / bad input into a "#RRGGBB" string. */
function normaliseHexColor(value: string | undefined, fallback: string): string {
  const raw = String(value ?? '').trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`.toUpperCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return `#${raw.toUpperCase()}`;
  }
  return fallback;
}

function clamp(value: number | undefined, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Projects launcher settings onto the mod's config schema. */
export function buildClientCoreConfig(settings: GlobalSettings): Pick<
  ClientCoreConfigFile,
  'debugOverlay' | 'renderFpsOnHUD' | 'enabledMods' | 'fps'
> {
  const fps = settings.fpsSettings ?? ({} as GlobalSettings['fpsSettings']);
  const enabledMods = Array.isArray(settings.enabledMods)
    ? settings.enabledMods.filter((m): m is string => typeof m === 'string')
    : [];

  return {
    debugOverlay: Boolean(settings.debugMode),
    renderFpsOnHUD: enabledMods.includes('FPS Counter'),
    enabledMods,
    fps: {
      position: toHudPosition(fps?.position),
      textColor: normaliseHexColor(fps?.color, '#FFFFFF'),
      useCustomTextColor: fps?.textColorToggle !== false,
      background: normaliseHexColor(fps?.background, '#000000'),
      showBackground: fps?.backgroundToggle !== false,
      backgroundOpacity: clamp(fps?.opacity, 0, 100, 50),
      fontSize: clamp(fps?.fontSize, 6, 48, 14),
      showAverage: fps?.showAverage !== false,
    },
  };
}

const DEFAULTS: ClientCoreConfigFile = {
  theme: 'cyan',
  enableBranding: true,
  enableCustomMainMenu: true,
  debugOverlay: false,
  renderFpsOnHUD: true,
  enabledMods: [],
  fps: {
    position: 'TOP_LEFT',
    textColor: '#FFFFFF',
    useCustomTextColor: true,
    background: '#000000',
    showBackground: true,
    backgroundOpacity: 50,
    fontSize: 14,
    showAverage: true,
  },
};

/**
 * Writes the mod config for one instance, merging over whatever is already
 * there. Returns the path written so callers can log it.
 */
export async function syncClientCoreConfig(instanceDir: string, settings: GlobalSettings): Promise<string> {
  const configDir = path.join(instanceDir, 'config');
  const target = path.join(configDir, CLIENT_CORE_CONFIG_FILE);

  let existing: Partial<ClientCoreConfigFile> = {};
  try {
    const parsed = JSON.parse(await fs.promises.readFile(target, 'utf8'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      existing = parsed;
    }
  } catch {
    // First write for this instance, or the file was unreadable — start clean.
  }

  const merged: ClientCoreConfigFile = {
    ...DEFAULTS,
    ...existing,
    ...buildClientCoreConfig(settings),
  };

  await fs.promises.mkdir(configDir, { recursive: true });
  const tempPath = `${target}.gravity-tmp`;
  await fs.promises.writeFile(tempPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  await fs.promises.rename(tempPath, target);
  return target;
}
