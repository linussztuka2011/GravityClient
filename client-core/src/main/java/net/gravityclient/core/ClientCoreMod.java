package net.gravityclient.core;

import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.minecraft.client.option.KeyBinding;
import net.minecraft.client.util.InputUtil;
import net.gravityclient.core.config.ClientCoreConfig;
import net.gravityclient.core.gui.ClientSettingsScreen;
import org.lwjgl.glfw.GLFW;

public class ClientCoreMod implements ClientModInitializer {
    public static final String MOD_ID = "gravity-client-core";
    private static KeyBinding settingsKeyBinding;
    private static ClientCoreConfig config;

    @Override
    public void onInitializeClient() {
        System.out.println("[GravityClient] Initializing companion Client-Core mod...");

        // Load config preset state written by launcher
        config = ClientCoreConfig.load();

        // Register custom Right Shift keybind to open settings
        settingsKeyBinding = KeyBindingHelper.registerKeyBinding(new KeyBinding(
            "key.gravityclient.settings", // Key description translation key
            InputUtil.Type.KEYSYM,
            GLFW.GLFW_KEY_RIGHT_SHIFT, // Default key is Right Shift
            "category.gravityclient.general" // Category translation key
        ));

        // Listen for keys pressed to open in-game Client Settings screen
        ClientTickEvents.END_CLIENT_TICK.register(client -> {
            while (settingsKeyBinding.wasPressed()) {
                if (client.currentScreen == null) {
                    client.setScreen(new ClientSettingsScreen(null));
                }
            }
        });

        System.out.println("[GravityClient] Successfully bound settings trigger (Default: RIGHT_SHIFT).");
    }

    public static ClientCoreConfig getConfig() {
        return config;
    }
}
