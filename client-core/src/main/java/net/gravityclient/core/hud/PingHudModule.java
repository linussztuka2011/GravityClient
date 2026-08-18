package net.gravityclient.core.hud;

import net.gravityclient.core.config.ClientCoreConfig;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.network.PlayerListEntry;

import java.util.Collections;

/** Shows the player's own latency to the current server. */
public class PingHudModule implements HudModule {
    @Override
    public String moduleName() {
        return "Ping Display";
    }

    @Override
    public HudAnchor anchor() {
        return HudAnchor.TOP_RIGHT;
    }

    @Override
    public void render(DrawContext context, MinecraftClient client, ClientCoreConfig config, HudLayout layout) {
        if (client.player == null || client.getNetworkHandler() == null) {
            return;
        }

        PlayerListEntry entry = client.getNetworkHandler().getPlayerListEntry(client.player.getUuid());
        if (entry == null) {
            return; // Singleplayer, or the list has not synced yet.
        }

        HudPainter.drawLines(
            context,
            client,
            Collections.singletonList("Ping: " + entry.getLatency() + " ms"),
            HudStyle.standard(),
            anchor(),
            layout
        );
    }
}
