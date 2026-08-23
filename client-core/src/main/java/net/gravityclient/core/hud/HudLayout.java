package net.gravityclient.core.hud;

import java.util.EnumMap;
import java.util.Map;

/**
 * Tracks how much vertical space each screen corner has already used during the
 * current frame, so several enabled modules stack instead of drawing on top of
 * one another. Reset once per frame before the modules run.
 */
public class HudLayout {
    /** Gap between stacked modules, in scaled screen pixels. */
    private static final int GAP = 2;

    private final Map<HudAnchor, Integer> used = new EnumMap<>(HudAnchor.class);

    public void reset() {
        used.clear();
    }

    /**
     * Reserves {@code height} pixels at the given corner.
     *
     * @return the offset from that corner at which the caller should draw
     */
    public int claim(HudAnchor anchor, int height) {
        int offset = used.getOrDefault(anchor, 0);
        used.put(anchor, offset + height + GAP);
        return offset;
    }
}
