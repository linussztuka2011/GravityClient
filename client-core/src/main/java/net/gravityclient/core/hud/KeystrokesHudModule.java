package net.gravityclient.core.hud;

import net.gravityclient.core.config.ClientCoreConfig;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.option.KeyBinding;

/**
 * Draws the classic WASD + mouse key display, reading live pressed state from
 * the player's own keybindings so remapped keys still light up correctly.
 */
public class KeystrokesHudModule implements HudModule {
    private static final int KEY = 20;
    private static final int GAP = 2;
    private static final int PRESSED_BG = 0xC0FFFFFF;
    private static final int IDLE_BG = 0x60000000;
    private static final int PRESSED_TEXT = 0xFF101010;
    private static final int IDLE_TEXT = 0xFFFFFFFF;

    @Override
    public String moduleName() {
        return "Keystrokes";
    }

    @Override
    public HudAnchor anchor() {
        return HudAnchor.BOTTOM_LEFT;
    }

    private void drawKey(DrawContext context, MinecraftClient client, int x, int y, int w, String label, boolean pressed) {
        context.fill(x, y, x + w, y + KEY, pressed ? PRESSED_BG : IDLE_BG);
        int textWidth = client.textRenderer.getWidth(label);
        context.drawTextWithShadow(
            client.textRenderer,
            label,
            x + (w - textWidth) / 2,
            y + (KEY - 8) / 2,
            pressed ? PRESSED_TEXT : IDLE_TEXT
        );
    }

    @Override
    public void render(DrawContext context, MinecraftClient client, ClientCoreConfig config, HudLayout layout) {
        if (client.player == null || client.options == null || client.textRenderer == null || client.getWindow() == null) {
            return;
        }

        // Three rows: W / ASD / LMB-RMB, plus a space bar.
        int rowWidth = KEY * 3 + GAP * 2;
        int totalHeight = KEY * 4 + GAP * 3;

        int screenWidth = client.getWindow().getScaledWidth();
        int screenHeight = client.getWindow().getScaledHeight();
        int offset = layout.claim(anchor(), totalHeight);

        int left = anchor().isLeft() ? HudPainter.MARGIN : screenWidth - HudPainter.MARGIN - rowWidth;
        int top = anchor().isTop()
            ? HudPainter.MARGIN + offset
            : screenHeight - HudPainter.MARGIN - totalHeight - offset;

        KeyBinding forward = client.options.forwardKey;
        KeyBinding back = client.options.backKey;
        KeyBinding leftKey = client.options.leftKey;
        KeyBinding rightKey = client.options.rightKey;
        KeyBinding jump = client.options.jumpKey;
        KeyBinding attack = client.options.attackKey;
        KeyBinding use = client.options.useKey;

        // Row 1: forward, centred.
        drawKey(context, client, left + KEY + GAP, top, KEY, "W", forward.isPressed());

        // Row 2: strafe left, back, strafe right.
        int row2 = top + KEY + GAP;
        drawKey(context, client, left, row2, KEY, "A", leftKey.isPressed());
        drawKey(context, client, left + KEY + GAP, row2, KEY, "S", back.isPressed());
        drawKey(context, client, left + (KEY + GAP) * 2, row2, KEY, "D", rightKey.isPressed());

        // Row 3: mouse buttons, each spanning half the block.
        int row3 = row2 + KEY + GAP;
        int halfWidth = (rowWidth - GAP) / 2;
        drawKey(context, client, left, row3, halfWidth, "LMB", attack.isPressed());
        drawKey(context, client, left + halfWidth + GAP, row3, rowWidth - halfWidth - GAP, "RMB", use.isPressed());

        // Row 4: jump, full width.
        drawKey(context, client, left, row3 + KEY + GAP, rowWidth, "____", jump.isPressed());
    }
}
