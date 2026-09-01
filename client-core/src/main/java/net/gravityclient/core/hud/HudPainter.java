package net.gravityclient.core.hud;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.font.TextRenderer;
import net.minecraft.client.gui.DrawContext;
import org.joml.Matrix3x2fStack;

import java.util.List;

/**
 * Draws a corner-anchored box of text lines. Centralises the anchoring,
 * background and font-scaling maths so every HUD module looks consistent and
 * stacks correctly.
 */
public final class HudPainter {
    /** Distance from the screen edge, in scaled screen pixels. */
    public static final int MARGIN = 4;
    /** Padding between the background plate and the text. */
    public static final int PADDING = 3;

    private HudPainter() {}

    /** Height the given lines will occupy, needed to reserve layout space. */
    public static int measureHeight(List<String> lines, HudStyle style) {
        if (lines.isEmpty()) {
            return 0;
        }
        int lineHeight = Math.round(HudStyle.BASE_FONT_HEIGHT * style.scale());
        return lineHeight * lines.size() + PADDING * 2;
    }

    public static int measureWidth(List<String> lines, HudStyle style, TextRenderer textRenderer) {
        int widest = 0;
        for (String line : lines) {
            widest = Math.max(widest, textRenderer.getWidth(line));
        }
        return Math.round(widest * style.scale()) + PADDING * 2;
    }

    /**
     * Draws the lines at {@code anchor}, offset by however much space earlier
     * modules already claimed at that corner.
     */
    public static void drawLines(
        DrawContext context,
        MinecraftClient client,
        List<String> lines,
        HudStyle style,
        HudAnchor anchor,
        HudLayout layout
    ) {
        if (lines.isEmpty() || client.textRenderer == null || client.getWindow() == null) {
            return;
        }

        TextRenderer textRenderer = client.textRenderer;
        float scale = style.scale();
        int boxWidth = measureWidth(lines, style, textRenderer);
        int boxHeight = measureHeight(lines, style);

        int screenWidth = client.getWindow().getScaledWidth();
        int screenHeight = client.getWindow().getScaledHeight();
        int stackOffset = layout.claim(anchor, boxHeight);

        int boxX = anchor.isLeft() ? MARGIN : screenWidth - MARGIN - boxWidth;
        int boxY = anchor.isTop()
            ? MARGIN + stackOffset
            : screenHeight - MARGIN - boxHeight - stackOffset;

        if (style.showBackground) {
            context.fill(boxX, boxY, boxX + boxWidth, boxY + boxHeight, style.backgroundColor);
        }

        // Since 1.21.11 the GUI uses a 2D matrix stack (Matrix3x2fStack) rather
        // than the old 3D MatrixStack. Scaling is applied around the origin, so
        // draw coordinates are divided back out.
        Matrix3x2fStack matrices = context.getMatrices();
        matrices.pushMatrix();
        matrices.scale(scale, scale);

        int lineHeight = Math.round(HudStyle.BASE_FONT_HEIGHT * scale);
        for (int i = 0; i < lines.size(); i++) {
            int textX = boxX + PADDING;
            int textY = boxY + PADDING + lineHeight * i;
            context.drawTextWithShadow(
                textRenderer,
                lines.get(i),
                Math.round(textX / scale),
                Math.round(textY / scale),
                style.textColor
            );
        }

        matrices.popMatrix();
    }
}
