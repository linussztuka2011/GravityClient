package net.gravityclient.core;

import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.fabricmc.fabric.api.client.rendering.v1.HudRenderCallback;
import net.minecraft.client.option.KeyBinding;
import net.minecraft.client.util.InputUtil;
import net.gravityclient.core.config.ClientCoreConfig;
import net.gravityclient.core.gui.ClientSettingsScreen;
import net.gravityclient.core.hud.FpsHudRenderer;
import org.lwjgl.glfw.GLFW;

public class ClientCoreMod implements ClientModInitializer {
    public static final String MOD_ID = "gravity-client-core";
    private static KeyBinding settingsKeyBinding;
    private static ClientCoreConfig config;
    private static FpsHudRenderer fpsHudRenderer;

    @Override
    public void onInitializeClient() {
        System.out.println("[GravityClient] Initializing companion Client-Core mod...");

        // Load config preset state written by launcher
        config = ClientCoreConfig.load();
        fpsHudRenderer = new FpsHudRenderer(config);

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

        // Draw the launcher-configured FPS overlay. The second callback argument
        // changes type across versions, so it is left inferred and unused.
        HudRenderCallback.EVENT.register((drawContext, tickCounter) -> fpsHudRenderer.render(drawContext));

        System.out.println("[GravityClient] Successfully bound settings trigger (Default: RIGHT_SHIFT).");
        System.out.println("[GravityClient] FPS overlay " + (config.renderFpsOnHUD ? "enabled" : "disabled")
            + " via launcher settings.");
    }

    public static ClientCoreConfig getConfig() {
        return config;
    }

    /**
     * Re-reads the config from disk. The launcher rewrites the file whenever
     * settings change, so this picks up edits made while the game is running.
     */
    public static ClientCoreConfig reloadConfig() {
        config = ClientCoreConfig.load();
        if (fpsHudRenderer != null) {
            fpsHudRenderer.setConfig(config);
        }
        return config;
    }
}
