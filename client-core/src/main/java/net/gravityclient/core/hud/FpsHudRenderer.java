package net.gravityclient.core.hud;

import net.gravityclient.core.config.ClientCoreConfig;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.font.TextRenderer;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.util.math.MatrixStack;

import java.util.ArrayDeque;
import java.util.Deque;

/**
 * Draws the FPS overlay described by the launcher's "Mod-Settings: FPS Counter"
 * screen — position, colours, background opacity, font size and the rolling
 * average are all read from the synced config.
 *
 * Frames are counted locally rather than read from a client field so the
 * overlay does not depend on mapping details that shift between versions.
 */
public class FpsHudRenderer {
    private static final int MARGIN = 4;
    private static final int PADDING = 3;
    /** Vanilla's font is 9px tall; this is the reference for the size slider. */
    private static final float BASE_FONT_HEIGHT = 9.0f;
    private static final int AVERAGE_WINDOW_SECONDS = 60;

    private final Deque<Integer> history = new ArrayDeque<>();
    private long windowStartedAt = 0L;
    private int framesThisSecond = 0;
    private int currentFps = 0;
    private int averageFps = 0;

    private ClientCoreConfig config;

    public FpsHudRenderer(ClientCoreConfig config) {
        this.config = config;
    }

    public void setConfig(ClientCoreConfig config) {
        this.config = config;
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

    public void render(DrawContext context) {
        tickCounters();

        if (config == null || !config.renderFpsOnHUD) {
            return;
        }

        MinecraftClient client = MinecraftClient.getInstance();
        if (client == null || client.getWindow() == null || client.textRenderer == null) {
            return;
        }
        // Respect the player hiding the HUD with F1.
        if (client.options != null && client.options.hudHidden) {
            return;
        }
        // Nothing meaningful to show until the first full second has elapsed.
        if (currentFps == 0) {
            return;
        }

        ClientCoreConfig.FpsSettings settings = config.fps;
        TextRenderer textRenderer = client.textRenderer;

        String text = "FPS: " + currentFps;
        if (settings.showAverage) {
            text = text + " (avg " + averageFps + ")";
        }

        float scale = settings.fontSize / BASE_FONT_HEIGHT;
        int boxWidth = Math.round(textRenderer.getWidth(text) * scale) + PADDING * 2;
        int boxHeight = Math.round(BASE_FONT_HEIGHT * scale) + PADDING * 2;

        int screenWidth = client.getWindow().getScaledWidth();
        int screenHeight = client.getWindow().getScaledHeight();

        int boxX = MARGIN;
        int boxY = MARGIN;
        switch (settings.position) {
            case "TOP_RIGHT":
                boxX = screenWidth - MARGIN - boxWidth;
                break;
            case "BOTTOM_LEFT":
                boxY = screenHeight - MARGIN - boxHeight;
                break;
            case "BOTTOM_RIGHT":
                boxX = screenWidth - MARGIN - boxWidth;
                boxY = screenHeight - MARGIN - boxHeight;
                break;
            default:
                // TOP_LEFT keeps the initial margins.
                break;
        }

        if (settings.showBackground) {
            context.fill(
                boxX,
                boxY,
                boxX + boxWidth,
                boxY + boxHeight,
                ClientCoreConfig.parseColor(settings.background, settings.backgroundOpacity, 0x000000)
            );
        }

        int textColor = settings.useCustomTextColor
            ? ClientCoreConfig.parseColor(settings.textColor, 100, 0xFFFFFF)
            : 0xFFFFFFFF;

        // Scale around the origin, so draw coordinates are divided back out.
        MatrixStack matrices = context.getMatrices();
        matrices.push();
        matrices.scale(scale, scale, 1.0f);
        context.drawTextWithShadow(
            textRenderer,
            text,
            Math.round((boxX + PADDING) / scale),
            Math.round((boxY + PADDING) / scale),
            textColor
        );
        matrices.pop();
    }
}
