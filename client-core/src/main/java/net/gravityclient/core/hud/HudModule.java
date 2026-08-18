package net.gravityclient.core.hud;

import net.gravityclient.core.config.ClientCoreConfig;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;

/**
 * One toggleable in-game overlay.
 *
 * {@link #moduleName()} must match the module's label in the launcher's
 * Mod-Menu exactly — that string is what the launcher writes into
 * {@code enabledMods} and what gates rendering here.
 */
public interface HudModule {
    String moduleName();

    /** Corner this module draws in when several are enabled at once. */
    default HudAnchor anchor() {
        return HudAnchor.TOP_LEFT;
    }

    /** Most modules need a player in the world; the FPS counter does not. */
    default boolean requiresPlayer() {
        return true;
    }

    void render(DrawContext context, MinecraftClient client, ClientCoreConfig config, HudLayout layout);
}
