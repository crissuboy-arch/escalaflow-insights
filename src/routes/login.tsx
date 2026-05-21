import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import logoHorizontal from "@/assets/brand/logo-horizontal.png";

export const Route = createFileRoute("/login")({ component: LoginPage });

const PARTICLES = [
  { top: "12%",  left: "8%",   size: 4, dur: "6s",  delay: "0s"   },
  { top: "25%",  left: "88%",  size: 3, dur: "8s",  delay: "1.2s" },
  { top: "68%",  left: "5%",   size: 5, dur: "7s",  delay: "2.4s" },
  { top: "80%",  left: "78%",  size: 3, dur: "9s",  delay: "0.6s" },
  { top: "42%",  left: "92%",  size: 4, dur: "11s", delay: "3.1s" },
  { top: "55%",  left: "15%",  size: 2, dur: "7.5s",delay: "1.8s" },
  { top: "90%",  left: "45%",  size: 3, dur: "10s", delay: "4.0s" },
  { top: "8%",   left: "60%",  size: 4, dur: "8.5s",delay: "2.0s" },
  { top: "35%",  left: "50%",  size: 2, dur: "12s", delay: "0.3s" },
  { top: "72%",  left: "35%",  size: 3, dur: "6.5s",delay: "3.7s" },
];

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [authLoading, user, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } =
        mode === "signin"
          ? await signIn(email, password)
          : await signUp(email, password, fullName);
      if (error) {
        toast.error(error);
        return;
      }
      if (mode === "signup") {
        toast.success("Conta criada! Você já pode entrar.");
        setMode("signin");
        return;
      }
      navigate({ to: "/dashboard", replace: true });
    } finally {
      setLoading(false);
    }
  };

  const google = () => {
    toast.info("Disponível em breve");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      {/* Aurora layers */}
      <div className="login-aurora-1 pointer-events-none" />
      <div className="login-aurora-2 pointer-events-none" />
      <div className="login-aurora-3 pointer-events-none" />

      {/* Floating particles */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="login-particle pointer-events-none"
          style={{
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            animationDuration: p.dur,
            animationDelay: p.delay,
          }}
        />
      ))}

      {/* Subtle grid */}
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-10" />

      {/* Top-right controls */}
      <div className="absolute right-4 top-4 z-10 flex gap-1">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        {/* ── Logo orb + title ── */}
        <div className="mb-10 flex flex-col items-center text-center">
          {/* Orb with three spinning rings */}
          <div
            className="relative mb-7 flex items-center justify-center"
            style={{ width: 128, height: 128 }}
          >
            {/* Ring 3 — outermost, slow dashed */}
            <div
              className="login-ring-3"
              style={{ width: 124, height: 124, top: 0, right: 0, bottom: 0, left: 0, margin: "auto" }}
            />
            {/* Ring 2 — mid, reverse purple */}
            <div
              className="login-ring-2"
              style={{ width: 106, height: 106, top: 0, right: 0, bottom: 0, left: 0, margin: "auto" }}
            />
            {/* Ring 1 — inner, bright blue */}
            <div
              className="login-ring-1"
              style={{ width: 90, height: 90, top: 0, right: 0, bottom: 0, left: 0, margin: "auto" }}
            />
            {/* Glassmorphism orb core */}
            <div
              className="login-logo-orb absolute flex items-center justify-center rounded-2xl"
              style={{ width: 72, height: 72, top: 0, right: 0, bottom: 0, left: 0, margin: "auto" }}
            >
              <img
                src={logoHorizontal}
                alt="EscalaFlow"
                className="h-9 w-auto object-contain"
                style={{ filter: "drop-shadow(0 0 8px oklch(0.74 0.18 248 / 0.6))" }}
              />
            </div>
          </div>

          <h1
            className="login-title-glow text-3xl font-bold tracking-tight text-foreground"
          >
            EscalaFlow
          </h1>
          <p className="mt-2 text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground/60">
            {t("auth.subtitle")}
          </p>
        </div>

        {/* ── Login card ── */}
        <Card className="login-card overflow-hidden rounded-2xl border-0">
          <CardContent className="p-7">
            <h2 className="mb-1 text-xl font-semibold tracking-tight">
              {mode === "signin" ? t("auth.welcomeBack") : t("auth.createAccount")}
            </h2>
            <p className="mb-5 text-sm text-muted-foreground">{t("app.tagline")}</p>

            {/* Google */}
            <Button
              type="button"
              variant="outline"
              className="w-full opacity-70"
              onClick={google}
              title="Disponível em breve"
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .55 4.1 1.6l3-3C17.2 1.9 14.8 1 12 1 7.4 1 3.4 3.6 1.4 7.4l3.5 2.7C5.9 7.1 8.7 5 12 5z"/>
                <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.2c-.3 1.4-1.1 2.6-2.3 3.4l3.6 2.8c2.1-2 3.5-4.9 3.5-8.4z"/>
                <path fill="#FBBC05" d="M4.9 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3L1.4 7C.5 8.5 0 10.2 0 12s.5 3.5 1.4 5l3.5-2.7z"/>
                <path fill="#34A853" d="M12 23c3.2 0 5.9-1.1 7.9-2.9l-3.6-2.8c-1 .7-2.3 1.1-4.3 1.1-3.3 0-6.1-2.2-7.1-5.1L1.4 16C3.4 19.9 7.4 23 12 23z"/>
              </svg>
              {t("auth.signInWithGoogle")}
            </Button>

            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              <span>{t("auth.or")}</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={submit} className="space-y-3">
              {mode === "signup" && (
                <div>
                  <Label htmlFor="name">{t("auth.fullName")}</Label>
                  <Input
                    id="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              )}
              <div>
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">{t("auth.password")}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "..." : mode === "signin" ? t("auth.signIn") : t("auth.signUp")}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              {mode === "signin" ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
              <button
                type="button"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="font-semibold text-primary hover:underline"
              >
                {mode === "signin" ? t("auth.signUp") : t("auth.signIn")}
              </button>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
