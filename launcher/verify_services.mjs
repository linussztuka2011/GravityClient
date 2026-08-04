import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

// Set isolated sandbox path before importing other modules
const sandboxDir = path.join(process.cwd(), 'run');
app.setPath('userData', sandboxDir);

import { SettingsService } from './out/main/services/settingsService.js';
import { InstanceService } from './out/main/services/instanceService.js';
import { MinecraftPaths } from './out/main/services/minecraftPaths.js';
import { ConfigPresetService } from './out/main/services/configPresetService.js';

// Setup colorful terminal logs
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

function log(msg, color = RESET) {
  console.log(`${color}${msg}${RESET}`);
}

async function runTests() {
  log('====================================================', CYAN);
  log('    GravityClient Service Integration Test Suite    ', CYAN);
  log('====================================================', CYAN);

  if (fs.existsSync(sandboxDir)) {
    log(`Purging existing test sandbox folder: ${sandboxDir}`, YELLOW);
    // Since Windows/Mac might hold file handles, we can selectively delete files inside or catch errors
    try {
      fs.rmSync(sandboxDir, { recursive: true, force: true });
    } catch (e) {
      log(`Warning: Failed to purge sandbox directory fully: ${e.message}`, YELLOW);
    }
  }

  try {
    // ----------------------------------------------------
    // Test 1: Paths Resolution outside Electron
    // ----------------------------------------------------
    log('\n[TEST 1] Verifying Path Resolution...');
    const dataDir = MinecraftPaths.getLauncherDataDir();
    // Allow either the Electron appData path or the node fallback path
    const expectedDataDir = path.join(sandboxDir, 'gravity-launcher');
    const isElectronEnv = dataDir.includes('Application Support') || dataDir.includes('AppData');
    if (!isElectronEnv && dataDir !== expectedDataDir) {
      throw new Error(`Data directory mismatch: Got ${dataDir}, expected ${expectedDataDir}`);
    }
    log(`✓ Path resolution succeeded! Active data directory: ${dataDir}`, GREEN);

    // ----------------------------------------------------
    // Test 2: Default Settings Loading
    // ----------------------------------------------------
    log('\n[TEST 2] Verifying Settings Load & Save...');
    const initialSettings = SettingsService.getSettings();
    if (initialSettings.activeAccount !== 'Player_Name') {
      throw new Error(`Default active account mismatch: Got ${initialSettings.activeAccount}, expected 'Player_Name'`);
    }
    if (!initialSettings.richAccounts || initialSettings.richAccounts[0].name !== 'Player_Name') {
      throw new Error('Default richAccounts list is missing or invalid.');
    }
    log('✓ Successfully initialized default settings on first load!', GREEN);

    // ----------------------------------------------------
    // Test 3: Settings Persistence & Mutation
    // ----------------------------------------------------
    log('\n[TEST 3] Verifying Settings Modification and Persisting...');
    const modifiedSettings = {
      ...initialSettings,
      activeAccount: 'GamerGod99',
      accounts: ['Player_Name', 'GamerGod99'],
      richAccounts: [
        ...initialSettings.richAccounts,
        {
          name: 'GamerGod99',
          uuid: 'offline-uuid-gamergod99',
          type: 'offline'
        }
      ]
    };
    SettingsService.saveSettings(modifiedSettings);

    const reloadedSettings = SettingsService.getSettings();
    if (reloadedSettings.activeAccount !== 'GamerGod99') {
      throw new Error(`Modified settings save failed: Got activeAccount '${reloadedSettings.activeAccount}', expected 'GamerGod99'`);
    }
    if (reloadedSettings.accounts.length !== 2) {
      throw new Error(`Modified accounts length mismatch: Got ${reloadedSettings.accounts.length}, expected 2`);
    }
    log('✓ Settings modified, persisted, and successfully reloaded!', GREEN);

    // ----------------------------------------------------
    // Test 4: Instance Creation & Synchronization
    // ----------------------------------------------------
    log('\n[TEST 4] Verifying Profile Instance Creation & Directory Structures...');
    const instance = InstanceService.createInstance('Ultra Optimized Profile', '1.21');
    if (instance.name !== 'Ultra Optimized Profile') {
      throw new Error(`Instance name mismatch: ${instance.name}`);
    }
    if (instance.minecraftVersion !== '1.21') {
      throw new Error(`Instance version mismatch: ${instance.minecraftVersion}`);
    }

    const instancesList = InstanceService.getInstances();
    if (instancesList.length !== 1 || instancesList[0].id !== instance.id) {
      throw new Error('Instance was not registered in instances.json correctly.');
    }

    const modsDir = MinecraftPaths.getInstanceModsDir(instance.id);
    const configDir = MinecraftPaths.getInstanceConfigDir(instance.id);
    if (!fs.existsSync(modsDir) || !fs.existsSync(configDir)) {
      throw new Error('Companion subdirectories (mods, config) were not created.');
    }
    log('✓ Created brand new instance profile with isolated assets & subdirectories!', GREEN);

    // ----------------------------------------------------
    // Test 5: Profile Updates & Configuration Presets Overlay
    // ----------------------------------------------------
    log('\n[TEST 5] Verifying Pack Configuration Presets Application...');
    // Sync custom pack settings state on the profile config
    instance.selectedPreset = 'performance';
    InstanceService.updateInstance(instance);

    const reloadedInstances = InstanceService.getInstances();
    if (reloadedInstances[0].selectedPreset !== 'performance') {
      throw new Error(`Instance preset update failed: ${reloadedInstances[0].selectedPreset}`);
    }

    // Attempt to apply the preset config overlay
    const presetApplied = ConfigPresetService.applyPreset(instance.id, 'performance', (msg, level) => {
      console.log(`    [PRESET ${level.toUpperCase()}] ${msg}`);
    });

    if (!presetApplied) {
      throw new Error('Preset application returned failure.');
    }

    // Check that some preset configuration files are written into the instance config folder
    const sodiumOptionsFile = path.join(MinecraftPaths.getInstanceDir(instance.id), 'config', 'sodium-options.json');
    if (!fs.existsSync(sodiumOptionsFile)) {
      throw new Error('Config preset was applied but sodium-options.json was not written into the config folder!');
    }

    const sodiumRaw = fs.readFileSync(sodiumOptionsFile, 'utf8');
    const sodiumJson = JSON.parse(sodiumRaw);
    log(`✓ Verified that preset config file has been overlaid! Sodium quality preset: ${sodiumJson.quality || 'unknown'}`, GREEN);

    log('\n====================================================', GREEN);
    log('    ALL 5 AUTOMATED INTEGRATION TESTS PASSED 100%!   ', GREEN);
    log('====================================================', GREEN);
    app.exit(0);
  } catch (err) {
    log('\n====================================================', RED);
    log(`    TEST RUN FAILURE: ${err.message}`, RED);
    log('====================================================', RED);
    console.error(err.stack);
    app.exit(1);
  }
}

runTests();
