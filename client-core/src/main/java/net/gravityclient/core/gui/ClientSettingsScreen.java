package net.gravityclient.core.gui;

import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.text.Text;
import net.gravityclient.core.ClientCoreMod;
import net.gravityclient.core.config.ClientCoreConfig;

public class ClientSettingsScreen extends Screen {
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
        // Screen.render draws the background before the widgets in this version.
        super.render(context, mouseX, mouseY, delta);

        int centerX = this.width / 2;
        context.drawCenteredTextWithShadow(this.textRenderer, this.title, centerX, 20, 0x66FCF1);
        context.drawCenteredTextWithShadow(
            this.textRenderer,
            Text.literal("LAUNCHER SYNCHRONIZATION STATUS: ACTIVE"),
            centerX, 40, 0x4EAF0A
        );

        ClientCoreConfig.FpsSettings fps = this.config.fps;
        int y = 62;
        int spacing = 14;

        y = line(context, centerX, y, spacing, "Preset Theme: " + safeUpper(this.config.theme), 0xFFFFFF);
        y = line(context, centerX, y, spacing, "HUD Branding: " + onOff(this.config.enableBranding), 0xC5C6C7);
        y = line(context, centerX, y, spacing, "FPS Overlay: " + onOff(this.config.renderFpsOnHUD), 0xC5C6C7);
        y = line(context, centerX, y, spacing,
            "  Position: " + fps.position + "   Size: " + fps.fontSize + "px", 0x9AA4AE);
        y = line(context, centerX, y, spacing,
            "  Text: " + fps.textColor + "   Background: " + fps.background
                + " @ " + fps.backgroundOpacity + "%", 0x9AA4AE);
        y = line(context, centerX, y, spacing, "  Rolling Average: " + onOff(fps.showAverage), 0x9AA4AE);
        y = line(context, centerX, y, spacing, "Debug Overlay: " + onOff(this.config.debugOverlay), 0xC5C6C7);

        int modCount = this.config.enabledMods == null ? 0 : this.config.enabledMods.size();
        y = line(context, centerX, y + 6, spacing, "Enabled launcher modules: " + modCount, 0xFFFFFF);
        if (modCount > 0) {
            line(context, centerX, y, spacing, String.join(", ", this.config.enabledMods), 0x8B949E);
        }

        context.drawCenteredTextWithShadow(
            this.textRenderer,
            Text.literal("Change these in the GravityClient launcher, then press Reload."),
            centerX, this.height - 58, 0x8B949E
        );
    }

    private int line(DrawContext context, int centerX, int y, int spacing, String text, int color) {
        context.drawCenteredTextWithShadow(this.textRenderer, Text.literal(text), centerX, y, color);
        return y + spacing;
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
