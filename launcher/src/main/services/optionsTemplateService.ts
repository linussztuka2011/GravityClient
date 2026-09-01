import * as fs from 'fs';
import * as path from 'path';

/**
 * Seeds new instances with an existing `options.txt`, so a fresh profile starts
 * with the player's own keybinds, FOV, accessibility, video and audio settings
 * instead of vanilla defaults.
 *
 * The template points at any Minecraft profile directory — a ModrinthApp or
 * Prism profile, a plain `.minecraft`, or another GravityClient instance.
 */

export const OPTIONS_FILE = 'options.txt';

export interface OptionsTemplateStatus {
  /** Configured template path, empty when the feature is off. */
  path: string;
  configured: boolean;
  /** Whether an options.txt can actually be read there right now. */
  available: boolean;
  /** Number of settings lines found, for a bit of confidence in the UI. */
  settingCount?: number;
  problem?: string;
}

/**
 * Accepts either a profile directory or a direct path to an options.txt and
 * returns the file path to read.
 */
export function resolveOptionsFile(templatePath: string): string {
  const trimmed = templatePath.trim();
  return path.basename(trimmed) === OPTIONS_FILE ? trimmed : path.join(trimmed, OPTIONS_FILE);
}

/** Inspects the configured template so the UI can show whether it will work. */
export function inspectOptionsTemplate(templatePath: string | undefined): OptionsTemplateStatus {
  const configured = Boolean(templatePath && templatePath.trim());
  if (!configured) {
    return { path: '', configured: false, available: false };
  }

  const file = resolveOptionsFile(templatePath as string);
  try {
    const contents = fs.readFileSync(file, 'utf8');
    const settingCount = contents.split(/\r?\n/).filter((l) => l.includes(':')).length;
    return { path: file, configured: true, available: true, settingCount };
  } catch (err: any) {
    return {
      path: file,
      configured: true,
      available: false,
      problem:
        err.code === 'ENOENT'
          ? `No ${OPTIONS_FILE} found at that location.`
          : `Could not read ${OPTIONS_FILE}: ${err.message}`,
    };
  }
}

export interface OptionsCopyResult {
  copied: boolean;
  reason?: string;
  settingCount?: number;
}

/**
 * Copies the template `options.txt` into a new instance.
 *
 * Never overwrites: once a profile has been played, its own options.txt is the
 * source of truth and clobbering it would discard in-game changes. Failures are
 * returned rather than thrown, since a profile without seeded settings is still
 * perfectly usable.
 */
export function applyOptionsTemplate(instanceDir: string, templatePath: string | undefined): OptionsCopyResult {
  if (!templatePath || !templatePath.trim()) {
    return { copied: false, reason: 'No settings template configured.' };
  }

  const target = path.join(instanceDir, OPTIONS_FILE);
  if (fs.existsSync(target)) {
    return { copied: false, reason: `${OPTIONS_FILE} already exists in this profile; left untouched.` };
  }

  const source = resolveOptionsFile(templatePath);
  let contents: string;
  try {
    contents = fs.readFileSync(source, 'utf8');
  } catch (err: any) {
    return {
      copied: false,
      reason:
        err.code === 'ENOENT'
          ? `No ${OPTIONS_FILE} at ${source}.`
          : `Could not read ${source}: ${err.message}`,
    };
  }

  try {
    fs.mkdirSync(instanceDir, { recursive: true });
    fs.writeFileSync(target, contents, 'utf8');
  } catch (err: any) {
    return { copied: false, reason: `Could not write ${OPTIONS_FILE}: ${err.message}` };
  }

  return {
    copied: true,
    settingCount: contents.split(/\r?\n/).filter((l) => l.includes(':')).length,
  };
}
