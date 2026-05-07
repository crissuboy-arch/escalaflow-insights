import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { toast } from "sonner";
import i18n from "@/i18n/config";
import { Radar, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/configuracoes")({ component: SettingsPage });

function SettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [fullName, setFullName] = useState("");
  const [language, setLanguage] = useState<string>(i18n.language || "pt");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    try {
      const raw = localStorage.getItem("escalaflow_profile");
      if (raw) {
        const p = JSON.parse(raw);
        setFullName(p.full_name ?? "");
        if (p.preferred_language) {
          setLanguage(p.preferred_language);
          i18n.changeLanguage(p.preferred_language);
        }
      }
    } catch {}
  }, [user]);

  const onSave = async () => {
    if (!user) return;
    setSaving(true);
    localStorage.setItem("escalaflow_profile", JSON.stringify({ full_name: fullName, preferred_language: language }));
    setSaving(false);
    i18n.changeLanguage(language);
    toast.success(t("settings.saved"));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("settings.title")}</h1>
        <p className="text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader><CardTitle>{t("settings.profile")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t("auth.email")}</Label>
              <Input value={user?.email ?? ""} disabled />
            </div>
            <div>
              <Label>{t("auth.fullName")}</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <Label>{t("settings.language")}</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">Português</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={onSave}
              disabled={saving}
              className="text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              {t("settings.save")}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader><CardTitle>{t("settings.theme")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                onClick={() => setTheme("light")}
                className="flex-1"
              >
                {t("settings.themeLight")}
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                onClick={() => setTheme("dark")}
                className="flex-1"
              >
                {t("settings.themeDark")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radar className="h-4 w-4 text-primary" />
              Motor de Coleta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              O Motor de Coleta permite mineração em massa de anúncios diretamente da
              Biblioteca de Anúncios. A chave é armazenada de forma segura no servidor
              e nunca é exposta no navegador.
            </p>
            <div>
              <Label>Chave do Motor de Coleta</Label>
              <Input
                type="password"
                value="••••••••••••••••"
                disabled
                readOnly
              />
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                Configurada com segurança. Para alterar, contate o administrador do workspace.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}