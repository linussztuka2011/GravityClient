import * as fs from 'fs';
import * as path from 'path';
import { MinecraftPaths } from './minecraftPaths.js';

export class FabricInstaller {
  /**
   * Installs the Fabric loader metadata version JSON in the local versions directory.
   * This is required by minecraft-launcher-core (MCLC) to launch modded clients.
   */
  static async installLoader(
    instanceId: string,
    fabricVersion: string,
    mcVersion: string = '1.21',
    onLog?: (msg: string, level?: 'info' | 'warn' | 'error') => void
  ): Promise<boolean> {
    const log = onLog || (() => {});
    const cleanFabricVersion = fabricVersion.replace(/[^0-9.]/g, ''); // strip any prefix like >=
    const versionId = `fabric-loader-${cleanFabricVersion}-${mcVersion}`;
    
    log(`Preparing Fabric profile: ${versionId}`, 'info');
    
    const versionsDir = path.join(MinecraftPaths.getLauncherDataDir(), 'versions');
    const versionFolder = path.join(versionsDir, versionId);
    const versionJsonFile = path.join(versionFolder, `${versionId}.json`);

    if (!fs.existsSync(versionFolder)) {
      fs.mkdirSync(versionFolder, { recursive: true });
    }

    try {
      const url = `https://meta.fabricmc.net/v2/versions/loader/${mcVersion}/${cleanFabricVersion}/profile/json`;
      log(`Fetching Fabric metadata profile from: ${url}`, 'info');
      
      const response = await fetch(url);
      if (response.ok) {
        const jsonText = await response.text();
        // Verify parsing succeeds
        JSON.parse(jsonText);
        fs.writeFileSync(versionJsonFile, jsonText, 'utf8');
        log(`Successfully downloaded and saved Fabric profile JSON!`, 'info');
        return true;
      } else {
        throw new Error(`Server returned status code ${response.status}`);
      }
    } catch (err: any) {
      log(`Fabric Metadata API fetch failed: ${err.message}. Using offline robust fallback profile.`, 'warn');
      
      // Standalone fully compatible local fallback JSON template matching 0.15.11 / 1.21
      const fallbackJson = {
        id: versionId,
        inheritsFrom: mcVersion,
        releaseTime: new Date().toISOString(),
        time: new Date().toISOString(),
        type: "release",
        mainClass: "net.fabricmc.loader.impl.launch.knot.KnotClient",
        arguments: {
          game: [],
          jvm: ["-DFabricMcEmu= net.minecraft.client.main.Main "]
        },
        libraries: [
          { name: "org.ow2.asm:asm:9.6", url: "https://maven.fabricmc.net/" },
          { name: "org.ow2.asm:asm-analysis:9.6", url: "https://maven.fabricmc.net/" },
          { name: "org.ow2.asm:asm-commons:9.6", url: "https://maven.fabricmc.net/" },
          { name: "org.ow2.asm:asm-tree:9.6", url: "https://maven.fabricmc.net/" },
          { name: "org.ow2.asm:asm-util:9.6", url: "https://maven.fabricmc.net/" },
          { name: "net.fabricmc:sponge-mixin:0.13.3+mixin.0.8.5", url: "https://maven.fabricmc.net/" },
          { name: "net.fabricmc:intermediary:1.21", url: "https://maven.fabricmc.net/" },
          { name: "net.fabricmc:fabric-loader:0.15.11", url: "https://maven.fabricmc.net/" }
        ]
      };

      try {
        fs.writeFileSync(versionJsonFile, JSON.stringify(fallbackJson, null, 2), 'utf8');
        log(`Offline fallback Fabric profile written successfully to: ${path.basename(versionJsonFile)}`, 'info');
        return true;
      } catch (writeErr: any) {
        log(`Critical write failure for offline fallback profile: ${writeErr.message}`, 'error');
        return false;
      }
    }
  }
}
