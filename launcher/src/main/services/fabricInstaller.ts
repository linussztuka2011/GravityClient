import * as fs from 'fs';
import * as path from 'path';
import { MinecraftPaths } from './minecraftPaths.js';

type VersionProfile = Record<string, any>;

export class FabricInstaller {
  /**
   * Fabric snapshots can require a newer loader than the one stored in an
   * existing profile. Ask Fabric's compatibility endpoint on every launch so
   * a profile never tries to boot a new Minecraft class format with an old
   * bundled ASM reader.
   */
  static async resolveCompatibleLoaderVersion(mcVersion: string, requestedVersion: string): Promise<string> {
    const requested = requestedVersion.replace(/[^0-9.]/g, '');

    try {
      const response = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${mcVersion}`);
      if (!response.ok) {
        throw new Error(`Fabric metadata returned HTTP ${response.status}`);
      }

      const candidates = await response.json() as Array<{ loader?: { version?: string; stable?: boolean } }>;
      const compatible = candidates.find((candidate) => candidate.loader?.stable && candidate.loader.version)
        ?? candidates.find((candidate) => candidate.loader?.version);
      if (!compatible?.loader?.version) {
        throw new Error('Fabric did not return a compatible loader version');
      }

      return compatible.loader.version;
    } catch {
      // Keeping the requested version gives normal releases an offline
      // fallback, while online launches still always select Fabric's current
      // compatible loader.
      return requested;
    }
  }

  /**
   * Resolves a Fabric profile into a complete version JSON that
   * minecraft-launcher-core can launch. Fabric's API returns an inherited
   * profile, while minecraft-launcher-core does not resolve `inheritsFrom`.
   */
  static async installLoader(
    _instanceId: string,
    fabricVersion: string,
    mcVersion: string = '1.21',
    onLog?: (msg: string, level?: 'info' | 'warn' | 'error') => void
  ): Promise<boolean> {
    const log = onLog || (() => {});
    const cleanFabricVersion = fabricVersion.replace(/[^0-9.]/g, '');
    const versionId = `fabric-loader-${cleanFabricVersion}-${mcVersion}`;
    const versionFolder = path.join(MinecraftPaths.getLauncherDataDir(), 'versions', versionId);
    const versionJsonFile = path.join(versionFolder, `${versionId}.json`);

    try {
      log(`Resolving official Fabric profile: ${versionId}`, 'info');
      const [fabricResponse, manifestResponse] = await Promise.all([
        fetch(`https://meta.fabricmc.net/v2/versions/loader/${mcVersion}/${cleanFabricVersion}/profile/json`),
        fetch('https://launchermeta.mojang.com/mc/game/version_manifest.json')
      ]);

      if (!fabricResponse.ok) {
        throw new Error(`Fabric metadata returned HTTP ${fabricResponse.status}`);
      }
      if (!manifestResponse.ok) {
        throw new Error(`Minecraft version manifest returned HTTP ${manifestResponse.status}`);
      }

      const fabricProfile = await fabricResponse.json() as VersionProfile;
      const manifest = await manifestResponse.json() as { versions?: Array<{ id: string; url: string }> };
      const vanillaEntry = manifest.versions?.find((version) => version.id === mcVersion);
      if (!vanillaEntry) {
        throw new Error(`Minecraft ${mcVersion} was not found in Mojang's release manifest`);
      }

      const vanillaResponse = await fetch(vanillaEntry.url);
      if (!vanillaResponse.ok) {
        throw new Error(`Minecraft ${mcVersion} metadata returned HTTP ${vanillaResponse.status}`);
      }
      const vanillaProfile = await vanillaResponse.json() as VersionProfile;
      const resolvedProfile = this.mergeProfiles(vanillaProfile, fabricProfile, versionId);

      fs.mkdirSync(versionFolder, { recursive: true });
      fs.writeFileSync(versionJsonFile, JSON.stringify(resolvedProfile, null, 2), 'utf8');
      log('Fabric and Minecraft metadata verified and saved.', 'info');
      return true;
    } catch (err: any) {
      // A guessed profile can appear to work but fails later with missing
      // libraries or assets. Do not claim the instance is launchable.
      log(`Unable to prepare a verified Fabric profile: ${err.message}`, 'error');
      return false;
    }
  }

  private static mergeProfiles(vanilla: VersionProfile, fabric: VersionProfile, versionId: string): VersionProfile {
    const vanillaArguments = vanilla.arguments || { game: [], jvm: [] };
    const fabricArguments = fabric.arguments || { game: [], jvm: [] };
    return {
      ...vanilla,
      ...fabric,
      id: versionId,
      inheritsFrom: undefined,
      libraries: [...(vanilla.libraries || []), ...(fabric.libraries || [])],
      arguments: {
        ...vanillaArguments,
        ...fabricArguments,
        game: [...(vanillaArguments.game || []), ...(fabricArguments.game || [])],
        jvm: [...(vanillaArguments.jvm || []), ...(fabricArguments.jvm || [])]
      }
    };
  }
}
