import * as fs from 'fs';
import pkg from 'minecraft-launcher-core';
import { MinecraftPaths } from './minecraftPaths.js';
import { SettingsService } from './settingsService.js';
import { InstanceService } from './instanceService.js';
import { FabricInstaller } from './fabricInstaller.js';
import { MicrosoftAuthService } from './microsoftAuthService.js';
import { syncClientCoreConfig } from './clientConfigService.js';

// Resolve Client from MCLC ESM wrapper
// @ts-ignore
const Client = pkg.Client || pkg;

export class LaunchService {
  /**
   * Orchestrates the real Minecraft launch sequence using minecraft-launcher-core.
   */
  static async launch(
    instanceId: string,
    onProgress?: (percent: number, step: string) => void,
    onLog?: (msg: string, level: 'info' | 'warn' | 'error') => void
  ): Promise<{ success: boolean; message: string }> {
    const log = onLog || ((msg, lvl) => console.log(`[LaunchService] [${lvl || 'info'}] ${msg}`));
    const progress = onProgress || (() => {});

    log(`Initializing launch coordinator for instance: ${instanceId}`, 'info');
    progress(5, 'Loading instance configuration');

    // 1. Load configuration details
    const instances = InstanceService.getInstances();
    const config = instances.find((inst) => inst.id === instanceId);
    if (!config) {
      log(`Failed to find instance config for ID: ${instanceId}`, 'error');
      return { success: false, message: `Instance ${instanceId} configuration not found.` };
    }

    const settings = SettingsService.getSettings();
    const activeAccount = settings.activeAccount || 'Player_Name';

    log(`Loading global settings. Allocated RAM: ${settings.ram}, User: ${activeAccount}`, 'info');

    // 2. Prepare Fabric Loader version profile
    progress(15, 'Verifying Fabric version profile');
    const mcVersion = config.minecraftVersion;
    const requestedFabricVersion = config.modLoaderVersion.replace(/[^0-9.]/g, '');
    const cleanFabricVersion = await FabricInstaller.resolveCompatibleLoaderVersion(mcVersion, requestedFabricVersion);
    if (cleanFabricVersion !== requestedFabricVersion) {
      log(`Updating Fabric Loader from ${requestedFabricVersion} to compatible version ${cleanFabricVersion} for Minecraft ${mcVersion}.`, 'info');
      config.modLoaderVersion = cleanFabricVersion;
      InstanceService.updateInstance(config);
    }
    const versionId = `fabric-loader-${cleanFabricVersion}-${mcVersion}`;

    const loaderOk = await FabricInstaller.installLoader(
      instanceId,
      cleanFabricVersion,
      mcVersion,
      (msg, lvl) => log(msg, lvl === 'warn' ? 'warn' : lvl === 'error' ? 'error' : 'info')
    );

    if (!loaderOk) {
      log('Failed to verify Fabric profile version JSON.', 'error');
      return { success: false, message: 'Fabric version profile setup failed.' };
    }

    // 3. Hand the current mod/HUD settings to the companion mod before it loads.
    progress(45, 'Syncing client-core configuration');
    try {
      const configPath = await syncClientCoreConfig(MinecraftPaths.getInstanceDir(instanceId), settings);
      log(`Client-core settings written to ${configPath}`, 'info');
    } catch (err: any) {
      log(`Could not write client-core config: ${err.message}. The mod will use its previous settings.`, 'warn');
    }

    // 4. Construct launching configurations
    progress(50, 'Assembling JVM execution parameters');

    const launcher = new Client();
    
    const rootDir = MinecraftPaths.getLauncherDataDir();
    const gameDir = MinecraftPaths.getInstanceDir(instanceId);

    log(`Launcher root directory: ${rootDir}`, 'info');
    let authorization = {
      access_token: 'null',
      client_token: 'null',
      uuid: 'offline-uuid-' + activeAccount.toLowerCase().replace(/[^a-z0-9]/g, ''),
      name: activeAccount,
      user_properties: '{}'
    };

    // Silent Microsoft Premium Auth verify & refresh if configured
    if (settings.richAccounts) {
      let richAcc = settings.richAccounts.find((a) => a.name === activeAccount);
      if (richAcc && richAcc.type === 'microsoft') {
        log(`Premium account identified: ${richAcc.name}. Validating credentials...`, 'info');
        try {
          const now = Date.now();
          if (!richAcc.accessToken || !richAcc.expiresAt || now >= richAcc.expiresAt) {
            log(`Minecraft Access Token is expired. Initiating silent refresh...`, 'info');
            const refreshed = await MicrosoftAuthService.refreshAccount(richAcc);
            
            // Persist the refreshed tokens immediately
            const updatedRich = (settings.richAccounts || []).map((a) => a.name === refreshed.name ? refreshed : a);
            SettingsService.saveSettings({
              ...settings,
              richAccounts: updatedRich
            });
            
            richAcc = refreshed;
            log(`Silent credentials refresh completed successfully!`, 'info');
          }

          authorization = {
            access_token: richAcc.accessToken || 'null',
            client_token: 'null',
            uuid: richAcc.uuid,
            name: richAcc.name,
            user_properties: '{}'
          };
          log(`Premium Auth active: Logged in securely as ${richAcc.name} (UUID: ${richAcc.uuid})!`, 'info');
        } catch (err: any) {
          log(`Failed to refresh premium credentials: ${err.message}. Falling back to offline execution.`, 'warn');
        }
      }
    }

    const maxMemory = settings.ram || '4G';
    // standard min memory is 1G or maxMemory / 4
    const minMemory = '1G';

    const opts: any = {
      authorization,
      root: rootDir,
      version: {
        // The Fabric profile is a locally resolved version. `custom` tells
        // minecraft-launcher-core to use that profile instead of attempting
        // to find a non-existent Fabric ID in Mojang's release manifest.
        number: versionId,
        custom: versionId,
        type: 'release'
      },
      memory: {
        max: maxMemory,
        min: minMemory
      },
      overrides: {
        gameDirectory: gameDir
      }
    };

    if (settings.customJava && settings.customJava.trim() !== '') {
      if (fs.existsSync(settings.customJava.trim())) {
        opts.javaPath = settings.customJava.trim();
        log(`Using custom JVM executable: ${opts.javaPath}`, 'info');
      } else {
        log(`Custom JVM path not found: ${settings.customJava}. Falling back to default JRE.`, 'warn');
      }
    }

    // 5. Fire off the launch
    progress(75, 'Spawning Minecraft Client process');
    log(`Spawning Minecraft version ${mcVersion} with authorization name: "${activeAccount}"`, 'info');

    try {
      // Subscribe before launch so initial download errors and Java failures
      // are visible to the user instead of being lost during startup.
      launcher.on('debug', (e: any) => {
        const text = e.toString().trim();
        console.log(`[MCLC DEBUG] ${text}`);
        if (text) log(text, text.includes('Failed') || text.includes("Couldn't") ? 'error' : 'info');
      });

      launcher.on('data', (e: any) => {
        const text = e.toString().trim();
        if (text) {
          console.log(`[MCLC DATA] ${text}`);
        }
      });

      launcher.on('download-status', (e: any) => {
        if (e.total > 0) {
          const pct = Math.round((e.current / e.total) * 100);
          progress(75 + Math.round((e.current / e.total) * 20), `Downloading ${e.name} (${pct}%)`);
        }
      });

      launcher.on('close', (code: any) => {
        console.log(`[MCLC CLOSE] Minecraft process closed with exit code ${code}`);
        log(`Minecraft process closed with exit code ${code}`, 'info');
      });

      const process = await launcher.launch(opts);
      if (!process) {
        return {
          success: false,
          message: 'Minecraft did not start. Check the launch log for the Java or download error.'
        };
      }

      progress(100, 'Minecraft started');
      log(`Minecraft started with process ID ${process.pid}.`, 'info');

      return {
        success: true,
        message: `Minecraft has launched! Play and test the active profile: "${config.name}".`
      };
    } catch (err: any) {
      log(`Failed to launch Minecraft Client: ${err.message}`, 'error');
      return {
        success: false,
        message: `Launch error: ${err.message}`
      };
    }
  }
}
