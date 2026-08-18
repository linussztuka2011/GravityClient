package net.gravityclient.core.hud;

/** Screen corner a HUD module anchors itself to. */
public enum HudAnchor {
    TOP_LEFT,
    TOP_RIGHT,
    BOTTOM_LEFT,
    BOTTOM_RIGHT;

    /** Parses the launcher's config value, falling back to the given default. */
    public static HudAnchor parse(String value, HudAnchor fallback) {
        if (value == null) {
            return fallback;
        }
        try {
            return HudAnchor.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ignored) {
            return fallback;
        }
    }

    public boolean isTop() {
        return this == TOP_LEFT || this == TOP_RIGHT;
    }

    public boolean isLeft() {
        return this == TOP_LEFT || this == BOTTOM_LEFT;
    }
}
