package net.gravityclient.core.config;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import net.fabricmc.loader.api.FabricLoader;

import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Runtime configuration for the companion mod. The launcher writes this exact
 * file (config/gravity-client-core.json) whenever settings change or a profile
 * is launched, so the fields here mirror the launcher's schema one-to-one.
 */
public class ClientCoreConfig {
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
    private static File configFile;

    /** Kept in sync with DEFAULT_SETTINGS.enabledMods in the launcher. */
    private static final List<String> DEFAULT_ENABLED_MODS = List.of(
        "FPS Counter", "Ping Display", "ToggleSprint/Sneak", "Direction HUD", "Armor Status"
    );

    public String theme = "cyan";
    public boolean enableBranding = true;
    public boolean enableCustomMainMenu = true;
    public boolean debugOverlay = false;
    public boolean renderFpsOnHUD = true;
    /**
     * Mirrors the launcher's default module selection, so the mod still shows
     * something sensible if the jar is installed without the launcher ever
     * having written a config.
     */
    public List<String> enabledMods = new ArrayList<>(DEFAULT_ENABLED_MODS);
    public FpsSettings fps = new FpsSettings();

    /** Mirrors the launcher's "Mod-Settings: FPS Counter" screen. */
    public static class FpsSettings {
        public String position = "TOP_LEFT";
        public String textColor = "#FFFFFF";
        public boolean useCustomTextColor = true;
        public String background = "#000000";
        public boolean showBackground = true;
        public int backgroundOpacity = 50;
        public int fontSize = 14;
        public boolean showAverage = true;
    }

    private static File resolveConfigFile() {
        if (configFile == null) {
            configFile = new File(FabricLoader.getInstance().getConfigDir().toFile(), "gravity-client-core.json");
        }
        return configFile;
    }

    public static ClientCoreConfig load() {
        File file = resolveConfigFile();
        if (!file.exists()) {
            ClientCoreConfig defaultConfig = new ClientCoreConfig();
            defaultConfig.save();
            return defaultConfig;
        }

        try (FileReader reader = new FileReader(file)) {
            ClientCoreConfig loaded = GSON.fromJson(reader, ClientCoreConfig.class);
            if (loaded == null) {
                return new ClientCoreConfig();
            }
            loaded.normalise();
            return loaded;
        } catch (IOException | RuntimeException e) {
            // A malformed file must not stop the game from starting.
            System.err.println("[GravityClient] Failed to load config file: " + e.getMessage());
            return new ClientCoreConfig();
        }
    }

    /** JSON may omit or null out nested objects; keep every accessor safe. */
    private void normalise() {
        if (fps == null) {
            fps = new FpsSettings();
        }
        if (enabledMods == null) {
            enabledMods = new ArrayList<>();
        }
        if (fps.position == null) {
            fps.position = "TOP_LEFT";
        }
        fps.backgroundOpacity = Math.max(0, Math.min(100, fps.backgroundOpacity));
        fps.fontSize = Math.max(6, Math.min(48, fps.fontSize));
    }

    public void save() {
        File file = resolveConfigFile();
        File parent = file.getParentFile();
        if (parent != null && !parent.exists()) {
            parent.mkdirs();
        }

        try (FileWriter writer = new FileWriter(file)) {
            GSON.toJson(this, writer);
        } catch (IOException e) {
            System.err.println("[GravityClient] Failed to save config file: " + e.getMessage());
        }
    }

    public boolean isModEnabled(String modName) {
        return enabledMods != null && enabledMods.contains(modName);
    }

    /**
     * Parses a "#RRGGBB" string into a 0xAARRGGBB colour.
     *
     * @param alphaPercent 0-100 opacity applied to the alpha channel
     */
    public static int parseColor(String hex, int alphaPercent, int fallbackRgb) {
        int rgb = fallbackRgb;
        if (hex != null) {
            String cleaned = hex.trim();
            if (cleaned.startsWith("#")) {
                cleaned = cleaned.substring(1);
            }
            if (cleaned.length() == 3) {
                // Expand shorthand (#abc -> #aabbcc).
                cleaned = new String(new char[] {
                    cleaned.charAt(0), cleaned.charAt(0),
                    cleaned.charAt(1), cleaned.charAt(1),
                    cleaned.charAt(2), cleaned.charAt(2)
                });
            }
            if (cleaned.length() == 6) {
                try {
                    rgb = Integer.parseInt(cleaned, 16);
                } catch (NumberFormatException ignored) {
                    rgb = fallbackRgb;
                }
            }
        }
        int alpha = Math.max(0, Math.min(255, Math.round(alphaPercent * 255f / 100f)));
        return (alpha << 24) | (rgb & 0xFFFFFF);
    }
}
