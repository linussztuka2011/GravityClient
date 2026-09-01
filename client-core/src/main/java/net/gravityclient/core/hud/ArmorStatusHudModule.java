package net.gravityclient.core.hud;

import net.gravityclient.core.config.ClientCoreConfig;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.entity.EquipmentSlot;
import net.minecraft.item.ItemStack;

import java.util.ArrayList;
import java.util.List;

/**
 * Shows equipped armour and the held item with their durability bars.
 *
 * Equipment is read through getEquippedStack(EquipmentSlot), which is stable
 * across versions, rather than reaching into the inventory's armour list.
 */
public class ArmorStatusHudModule implements HudModule {
    private static final int SLOT = 20;
    private static final int GAP = 2;

    /** Head first so the column reads top-down like the player model. */
    private static final EquipmentSlot[] SLOTS = {
        EquipmentSlot.HEAD,
        EquipmentSlot.CHEST,
        EquipmentSlot.LEGS,
        EquipmentSlot.FEET,
        EquipmentSlot.MAINHAND,
    };

    @Override
    public String moduleName() {
        return "Armor Status";
    }

    @Override
    public HudAnchor anchor() {
        return HudAnchor.BOTTOM_RIGHT;
    }

    @Override
    public void render(DrawContext context, MinecraftClient client, ClientCoreConfig config, HudLayout layout) {
        if (client.player == null || client.textRenderer == null || client.getWindow() == null) {
            return;
        }

        List<ItemStack> equipped = new ArrayList<>();
        for (EquipmentSlot slot : SLOTS) {
            ItemStack stack = client.player.getEquippedStack(slot);
            if (!stack.isEmpty()) {
                equipped.add(stack);
            }
        }
        if (equipped.isEmpty()) {
            return;
        }

        int totalHeight = equipped.size() * SLOT + (equipped.size() - 1) * GAP;
        int screenWidth = client.getWindow().getScaledWidth();
        int screenHeight = client.getWindow().getScaledHeight();
        int offset = layout.claim(anchor(), totalHeight);

        int x = anchor().isLeft() ? HudPainter.MARGIN : screenWidth - HudPainter.MARGIN - SLOT;
        int top = anchor().isTop()
            ? HudPainter.MARGIN + offset
            : screenHeight - HudPainter.MARGIN - totalHeight - offset;

        for (int i = 0; i < equipped.size(); i++) {
            ItemStack stack = equipped.get(i);
            int y = top + i * (SLOT + GAP);
            context.drawItem(stack, x, y);
            // Draws the stack count and the durability bar over the icon.
            context.drawStackOverlay(client.textRenderer, stack, x, y);
        }
    }
}
