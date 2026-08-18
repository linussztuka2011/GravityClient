package net.gravityclient.core.hud;

import net.gravityclient.core.config.ClientCoreConfig;

/**
 * Visual treatment for a HUD box. The FPS module builds one from the launcher's
 * "Mod-Settings: FPS Counter" screen; the other modules use {@link #standard()},
 * since the launcher exposes no styling controls for them yet.
 */
public class HudStyle {
    /** Vanilla's font is 9px tall; the size slider is relative to this. */
    public static final float BASE_FONT_HEIGHT = 9.0f;

    public final int textColor;
    public final int backgroundColor;
    public final boolean showBackground;
    public final int fontSize;

    public HudStyle(int textColor, int backgroundColor, boolean showBackground, int fontSize) {
        this.textColor = textColor;
        this.backgroundColor = backgroundColor;
        this.showBackground = showBackground;
        this.fontSize = fontSize;
    }

    /** Default look: white text on a half-transparent black plate. */
    public static HudStyle standard() {
        return new HudStyle(0xFFFFFFFF, ClientCoreConfig.parseColor("#000000", 50, 0x000000), true, 9);
    }

    /** Builds the FPS module's style from the synced launcher settings. */
    public static HudStyle fromFpsSettings(ClientCoreConfig.FpsSettings settings) {
        int text = settings.useCustomTextColor
            ? ClientCoreConfig.parseColor(settings.textColor, 100, 0xFFFFFF)
            : 0xFFFFFFFF;
        return new HudStyle(
            text,
            ClientCoreConfig.parseColor(settings.background, settings.backgroundOpacity, 0x000000),
            settings.showBackground,
            settings.fontSize
        );
    }

    public float scale() {
        return fontSize / BASE_FONT_HEIGHT;
    }
}
