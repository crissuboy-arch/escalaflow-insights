import { createFileRoute, redirect } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DualModeHub } from "@/components/pipeline/DualModeHub";
import { StandaloneCheckout } from "@/components/pipeline/StandaloneCheckout";

export const Route = createFileRoute("/_authenticated/checkout")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: CheckoutHubPage,
});

function CheckoutHubPage() {
  return (
    <DualModeHub
      title="Checkout & Oferta"
      description="Preço, preço âncora, bônus, order bump, upsell, downsell, garantia e link da plataforma (Kiwify, Hotmart, Stripe)."
      icon={ShoppingCart}
      tab="checkout"
      metaKey="checkout"
      accent="linear-gradient(135deg, #10b981, #06b6d4)"
      standalone={<StandaloneCheckout />}
    />
  );
}