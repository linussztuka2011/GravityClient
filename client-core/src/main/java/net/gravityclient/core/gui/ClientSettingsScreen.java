package net.gravityclient.core.gui;

import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.text.Text;
import net.gravityclient.core.config.ClientCoreConfig;

public class ClientSettingsScreen extends Screen {
    private final Screen parent;
    private final ClientCoreConfig config;

    public ClientSettingsScreen(Screen parent) {
        super(Text.literal("Gravity Client Settings"));
        this.parent = parent;
        this.config = ClientCoreConfig.load();
    }

    @Override
    protected void init() {
        super.init();

        // Add a back button
        int buttonWidth = 150;
        int buttonHeight = 20;
        this.addDrawableChild(ButtonWidget.builder(Text.literal("Back"), button -> {
            if (this.client != null) {
                this.client.setScreen(this.parent);
            }
        }).dimensions(this.width / 2 - buttonWidth / 2, this.height - 40, buttonWidth, buttonHeight).build());
    }

    @Override
    public void render(DrawContext context, int mouseX, int mouseY, float delta) {
        super.render(context, mouseX, mouseY, delta);

        // Draw background
        this.renderBackground(context, mouseX, mouseY, delta);

        // Draw title
        context.drawCenteredTextWithShadow(this.textRenderer, this.title, this.width / 2, 20, 0x66FCF1);

        // Draw active configurations synced with launcher
        int yStart = 60;
        int spacing = 18;
        context.drawCenteredTextWithShadow(this.textRenderer, Text.literal("LAUNCHER SYNCHRONIZATION STATUS: ACTIVE"), this.width / 2, yStart, 0x4EAF0A);
        
        context.drawCenteredTextWithShadow(this.textRenderer, Text.literal("Current Preset Theme: " + config.theme.toUpperCase()), this.width / 2, yStart + spacing * 2, 0xFFFFFF);
        context.drawCenteredTextWithShadow(this.textRenderer, Text.literal("HUD Branding: " + (config.enableBranding ? "ENABLED" : "DISABLED")), this.width / 2, yStart + spacing * 3, 0xC5C6C7);
        context.drawCenteredTextWithShadow(this.textRenderer, Text.literal("Main Menu Customizer: " + (config.enableCustomMainMenu ? "ENABLED" : "DISABLED")), this.width / 2, yStart + spacing * 4, 0xC5C6C7);
        context.drawCenteredTextWithShadow(this.textRenderer, Text.literal("FPS Meter on HUD: " + (config.renderFpsOnHUD ? "ENABLED" : "DISABLED")), this.width / 2, yStart + spacing * 5, 0xC5C6C7);
        
        context.drawCenteredTextWithShadow(this.textRenderer, Text.literal("In-game settings and overlay toggles can be configured in future passes."), this.width / 2, yStart + spacing * 8, 0x8B949E);
    }

    @Override
    public void close() {
        if (this.client != null) {
            this.client.setScreen(this.parent);
        }
    }
}
