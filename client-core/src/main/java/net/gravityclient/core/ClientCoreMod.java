package net.gravityclient.core;

import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.fabricmc.fabric.api.client.rendering.v1.HudRenderCallback;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.option.KeyBinding;
import net.minecraft.client.util.InputUtil;
import net.minecraft.util.Identifier;
import net.gravityclient.core.config.ClientCoreConfig;
import net.gravityclient.core.gui.ClientSettingsScreen;
import net.gravityclient.core.hud.ArmorStatusHudModule;
import net.gravityclient.core.hud.DirectionHudModule;
import net.gravityclient.core.hud.FpsHudRenderer;
import net.gravityclient.core.hud.HudLayout;
import net.gravityclient.core.hud.HudModule;
import net.gravityclient.core.hud.KeystrokesHudModule;
import net.gravityclient.core.hud.PingHudModule;
import org.lwjgl.glfw.GLFW;

import java.util.List;

public class ClientCoreMod implements ClientModInitializer {
    public static final String MOD_ID = "gravity-client-core";
    private static KeyBinding settingsKeyBinding;
    private static ClientCoreConfig config;

    /** Every overlay the mod can draw; each is gated on the launcher's toggles. */
    private static final List<HudModule> HUD_MODULES = List.of(
        new FpsHudRenderer(),
        new PingHudModule(),
        new DirectionHudModule(),
        new KeystrokesHudModule(),
        new ArmorStatusHudModule()
    );

    private static final HudLayout HUD_LAYOUT = new HudLayout();

    @Override
    public void onInitializeClient() {
        System.out.println("[GravityClient] Initializing companion Client-Core mod...");

        // Load config preset state written by launcher
        config = ClientCoreConfig.load();

        // Register custom Right Shift keybind to open settings.
        // Since 1.21.11 the category is a KeyBinding.Category record keyed by an
        // Identifier rather than a raw translation-key string.
        settingsKeyBinding = KeyBindingHelper.registerKeyBinding(new KeyBinding(
            "key.gravityclient.settings", // Key description translation key
            InputUtil.Type.KEYSYM,
            GLFW.GLFW_KEY_RIGHT_SHIFT, // Default key is Right Shift
            KeyBinding.Category.create(Identifier.of(MOD_ID, "general"))
        ));

        // Listen for keys pressed to open in-game Client Settings screen
        ClientTickEvents.END_CLIENT_TICK.register(client -> {
            while (settingsKeyBinding.wasPressed()) {
                if (client.currentScreen == null) {
                    client.setScreen(new ClientSettingsScreen(null));
                }
            }
        });

        // Draw the enabled overlays. The second callback argument changes type
        // across versions, so it is left inferred and unused.
        HudRenderCallback.EVENT.register((drawContext, tickCounter) -> renderHud(drawContext));

        System.out.println("[GravityClient] Successfully bound settings trigger (Default: RIGHT_SHIFT).");
        System.out.println("[GravityClient] Active HUD modules: " + describeEnabledModules());
    }

    private static void renderHud(DrawContext context) {
        ClientCoreConfig current = config;
        if (current == null) {
            return;
        }

        MinecraftClient client = MinecraftClient.getInstance();
        if (client == null || client.getWindow() == null) {
            return;
        }
        // Respect the player hiding the HUD with F1.
        if (client.options != null && client.options.hudHidden) {
            return;
        }

        // Corner offsets are per-frame, so stacked modules do not drift.
        HUD_LAYOUT.reset();
        for (HudModule module : HUD_MODULES) {
            if (!current.isModEnabled(module.moduleName())) {
                continue;
            }
            if (module.requiresPlayer() && client.player == null) {
                continue;
            }
            try {
                module.render(context, client, current, HUD_LAYOUT);
            } catch (RuntimeException e) {
                // One misbehaving overlay must not take down the whole HUD.
                System.err.println("[GravityClient] HUD module '" + module.moduleName() + "' failed: " + e);
            }
        }
    }

    private static String describeEnabledModules() {
        StringBuilder enabled = new StringBuilder();
        for (HudModule module : HUD_MODULES) {
            if (config.isModEnabled(module.moduleName())) {
                if (enabled.length() > 0) {
                    enabled.append(", ");
                }
                enabled.append(module.moduleName());
            }
        }
        return enabled.length() == 0 ? "none" : enabled.toString();
    }

    public static ClientCoreConfig getConfig() {
        return config;
    }

    /**
     * Re-reads the config from disk. The launcher rewrites the file whenever
     * settings change, so this picks up edits made while the game is running.
     */
    public static ClientCoreConfig reloadConfig() {
        // Modules read the config passed in on each render, so swapping the
        // field is enough for the new settings to take effect immediately.
        config = ClientCoreConfig.load();
        return config;
    }
}
