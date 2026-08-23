package net.gravityclient.core.hud;

import net.gravityclient.core.config.ClientCoreConfig;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;

import java.util.Arrays;

/** Shows the player's facing direction and block coordinates. */
public class DirectionHudModule implements HudModule {
    @Override
    public String moduleName() {
        return "Direction HUD";
    }

    @Override
    public HudAnchor anchor() {
        return HudAnchor.TOP_RIGHT;
    }

    /**
     * Cardinal name for a yaw, derived arithmetically rather than through
     * Direction's helpers, whose names move between mapping versions.
     * In Minecraft yaw 0 faces south (+Z) and increases clockwise.
     */
    private static String cardinal(float yaw) {
        int sector = Math.floorMod(Math.round(MathHelper.wrapDegrees(yaw) / 45.0f), 8);
        return switch (sector) {
            case 0 -> "South (+Z)";
            case 1 -> "South West";
            case 2 -> "West (-X)";
            case 3 -> "North West";
            case 4 -> "North (-Z)";
            case 5 -> "North East";
            case 6 -> "East (+X)";
            default -> "South East";
        };
    }

    @Override
    public void render(DrawContext context, MinecraftClient client, ClientCoreConfig config, HudLayout layout) {
        if (client.player == null) {
            return;
        }

        BlockPos pos = client.player.getBlockPos();
        HudPainter.drawLines(
            context,
            client,
            Arrays.asList(
                "Facing: " + cardinal(client.player.getYaw()),
                "XYZ: " + pos.getX() + " / " + pos.getY() + " / " + pos.getZ()
            ),
            HudStyle.standard(),
            anchor(),
            layout
        );
    }
}
