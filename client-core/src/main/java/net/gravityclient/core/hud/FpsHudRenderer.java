package net.gravityclient.core.hud;

import net.gravityclient.core.config.ClientCoreConfig;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;

import java.util.ArrayDeque;
import java.util.Collections;
import java.util.Deque;

/**
 * Draws the FPS overlay described by the launcher's "Mod-Settings: FPS Counter"
 * screen — position, colours, background opacity, font size and the rolling
 * average are all read from the synced config.
 *
 * Frames are counted locally rather than read from a client field so the
 * overlay does not depend on mapping details that shift between versions.
 */
public class FpsHudRenderer implements HudModule {
    private static final int AVERAGE_WINDOW_SECONDS = 60;

    private final Deque<Integer> history = new ArrayDeque<>();
    private long windowStartedAt = 0L;
    private int framesThisSecond = 0;
    private int currentFps = 0;
    private int averageFps = 0;

    @Override
    public String moduleName() {
        return "FPS Counter";
    }

    @Override
    public boolean requiresPlayer() {
        // Frame rate is meaningful on menus too.
        return false;
    }

    @Override
    public HudAnchor anchor() {
        return HudAnchor.TOP_LEFT;
    }

    /** Anchor comes from the FPS settings screen rather than the default. */
    public HudAnchor anchorFor(ClientCoreConfig config) {
        return HudAnchor.parse(config.fps.position, HudAnchor.TOP_LEFT);
    }

    private void tickCounters() {
        long now = System.currentTimeMillis();
        if (windowStartedAt == 0L) {
            windowStartedAt = now;
        }
        framesThisSecond++;

        if (now - windowStartedAt >= 1000L) {
            currentFps = framesThisSecond;
            framesThisSecond = 0;
            windowStartedAt = now;

            history.addLast(currentFps);
            while (history.size() > AVERAGE_WINDOW_SECONDS) {
                history.removeFirst();
            }

            int total = 0;
            for (int sample : history) {
                total += sample;
            }
            averageFps = history.isEmpty() ? currentFps : total / history.size();
        }
    }

    @Override
    public void render(DrawContext context, MinecraftClient client, ClientCoreConfig config, HudLayout layout) {
        // Counted every frame, even before the first full second has elapsed.
        tickCounters();

        // Legacy toggle kept alongside the module list for older configs.
        if (!config.renderFpsOnHUD) {
            return;
        }
        if (currentFps == 0) {
            return; // Nothing meaningful to show yet.
        }

        String text = "FPS: " + currentFps;
        if (config.fps.showAverage) {
            text = text + " (avg " + averageFps + ")";
        }

        HudPainter.drawLines(
            context,
            client,
            Collections.singletonList(text),
            HudStyle.fromFpsSettings(config.fps),
            anchorFor(config),
            layout
        );
    }
}
