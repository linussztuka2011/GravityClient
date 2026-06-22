package net.gravityclient.core.mixin;

import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.screen.TitleScreen;
import net.minecraft.text.Text;
import net.gravityclient.core.ClientCoreMod;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(TitleScreen.class)
public abstract class TitleScreenMixin extends Screen {

    protected TitleScreenMixin(Text title) {
        super(title);
    }

    @Inject(at = @At("TAIL"), method = "render")
    private void renderGravityBranding(DrawContext context, int mouseX, int mouseY, float delta, CallbackInfo ci) {
        // Only draw if enabled in our synchronized preset configurations
        if (ClientCoreMod.getConfig() != null && ClientCoreMod.getConfig().enableBranding) {
            String text = "GravityClient v1.0.0 (Synced)";
            // Render text in the top-left of the title screen with our electric cyan color
            context.drawTextWithShadow(this.textRenderer, text, 6, 6, 0x66FCF1);
        }
    }
}
