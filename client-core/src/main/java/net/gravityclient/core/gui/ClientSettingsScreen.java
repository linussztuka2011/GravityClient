package net.gravityclient.core.gui;

import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.text.Text;
import net.gravityclient.core.ClientCoreMod;
import net.gravityclient.core.config.ClientCoreConfig;

public class ClientSettingsScreen extends Screen {
    /**
     * Since 1.21, DrawContext.drawText returns without drawing anything when the
     * colour's alpha byte is zero, so a plain 0xRRGGBB literal is invisible
     * rather than opaque. Every colour below is built through opaque().
     */
    private static final int ALPHA_OPAQUE = 0xFF000000;
    private static final int TITLE_COLOR = 0x66FCF1;
    private static final int STATUS_COLOR = 0x4EAF0A;
    private static final int PRIMARY_COLOR = 0xFFFFFF;
    private static final int SECONDARY_COLOR = 0xC5C6C7;
    private static final int DETAIL_COLOR = 0x9AA4AE;
    private static final int MUTED_COLOR = 0x8B949E;

    private final Screen parent;
    private ClientCoreConfig config;

    public ClientSettingsScreen(Screen parent) {
        super(Text.literal("Gravity Client Settings"));
        this.parent = parent;
        this.config = ClientCoreMod.getConfig();
        if (this.config == null) {
            this.config = ClientCoreConfig.load();
        }
    }

    @Override
    protected void init() {
        super.init();

        int buttonWidth = 150;
        int buttonHeight = 20;
        int centerX = this.width / 2;

        // Pull in any changes the launcher wrote while the game was running.
        this.addDrawableChild(ButtonWidget.builder(Text.literal("Reload from Launcher"), button -> {
            this.config = ClientCoreMod.reloadConfig();
        }).dimensions(centerX - buttonWidth - 5, this.height - 40, buttonWidth, buttonHeight).build());

        this.addDrawableChild(ButtonWidget.builder(Text.literal("Back"), button -> {
            if (this.client != null) {
                this.client.setScreen(this.parent);
            }
        }).dimensions(centerX + 5, this.height - 40, buttonWidth, buttonHeight).build());
    }

    @Override
    public void render(DrawContext context, int mouseX, int mouseY, float delta) {
        // Screen.render only iterates the widgets here; the background is drawn
        // by renderWithTooltip before this runs, so do not draw it again.
        super.render(context, mouseX, mouseY, delta);

        int centerX = this.width / 2;
        context.drawCenteredTextWithShadow(this.textRenderer, this.title, centerX, 20, opaque(TITLE_COLOR));
        context.drawCenteredTextWithShadow(
            this.textRenderer,
            Text.literal("LAUNCHER SYNCHRONIZATION STATUS: ACTIVE"),
            centerX, 40, opaque(STATUS_COLOR)
        );

        ClientCoreConfig.FpsSettings fps = this.config.fps;
        int y = 62;
        int spacing = 14;

        y = line(context, centerX, y, spacing, "Preset Theme: " + safeUpper(this.config.theme), PRIMARY_COLOR);
        y = line(context, centerX, y, spacing, "HUD Branding: " + onOff(this.config.enableBranding), SECONDARY_COLOR);
        y = line(context, centerX, y, spacing, "FPS Overlay: " + onOff(this.config.renderFpsOnHUD), SECONDARY_COLOR);
        y = line(context, centerX, y, spacing,
            "  Position: " + fps.position + "   Size: " + fps.fontSize + "px", DETAIL_COLOR);
        y = line(context, centerX, y, spacing,
            "  Text: " + fps.textColor + "   Background: " + fps.background
                + " @ " + fps.backgroundOpacity + "%", DETAIL_COLOR);
        y = line(context, centerX, y, spacing, "  Rolling Average: " + onOff(fps.showAverage), DETAIL_COLOR);
        y = line(context, centerX, y, spacing, "Debug Overlay: " + onOff(this.config.debugOverlay), SECONDARY_COLOR);

        int modCount = this.config.enabledMods == null ? 0 : this.config.enabledMods.size();
        y = line(context, centerX, y + 6, spacing, "Enabled launcher modules: " + modCount, PRIMARY_COLOR);
        if (modCount > 0) {
            line(context, centerX, y, spacing, String.join(", ", this.config.enabledMods), MUTED_COLOR);
        }

        context.drawCenteredTextWithShadow(
            this.textRenderer,
            Text.literal("Change these in the GravityClient launcher, then press Reload."),
            centerX, this.height - 58, opaque(MUTED_COLOR)
        );
    }

    private int line(DrawContext context, int centerX, int y, int spacing, String text, int color) {
        context.drawCenteredTextWithShadow(this.textRenderer, Text.literal(text), centerX, y, opaque(color));
        return y + spacing;
    }

    /** Adds the alpha byte that DrawContext requires to draw anything at all. */
    private static int opaque(int rgb) {
        return ALPHA_OPAQUE | rgb;
    }

    private static String onOff(boolean value) {
        return value ? "ENABLED" : "DISABLED";
    }

    private static String safeUpper(String value) {
        return value == null ? "DEFAULT" : value.toUpperCase();
    }

    @Override
    public void close() {
        if (this.client != null) {
            this.client.setScreen(this.parent);
        }
    }
}
