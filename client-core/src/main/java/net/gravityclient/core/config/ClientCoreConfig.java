package net.gravityclient.core.config;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import net.fabricmc.loader.api.FabricLoader;

import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;

public class ClientCoreConfig {
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
    private static File configFile;

    // Fields aligning perfectly with the launcher's JSON structure
    public String theme = "cyan";
    public boolean enableBranding = true;
    public boolean enableCustomMainMenu = true;
    public boolean debugOverlay = false;
    public boolean renderFpsOnHUD = true;

    public static ClientCoreConfig load() {
        configFile = new File(FabricLoader.getInstance().getConfigDir().toFile(), "gravity-client-core.json");
        if (!configFile.exists()) {
            ClientCoreConfig defaultConfig = new ClientCoreConfig();
            defaultConfig.save();
            return defaultConfig;
        }

        try (FileReader reader = new FileReader(configFile)) {
            ClientCoreConfig loaded = GSON.fromJson(reader, ClientCoreConfig.class);
            return loaded != null ? loaded : new ClientCoreConfig();
        } catch (IOException e) {
            System.err.println("[GravityClient] Failed to load config file: " + e.getMessage());
            return new ClientCoreConfig();
        }
    }

    public void save() {
        if (configFile == null) {
            configFile = new File(FabricLoader.getInstance().getConfigDir().toFile(), "gravity-client-core.json");
        }
        
        // Ensure parent directories exist
        File parent = configFile.getParentFile();
        if (parent != null && !parent.exists()) {
            parent.mkdirs();
        }

        try (FileWriter writer = new FileWriter(configFile)) {
            GSON.toJson(this, writer);
        } catch (IOException e) {
            System.err.println("[GravityClient] Failed to save config file: " + e.getMessage());
        }
    }
}
