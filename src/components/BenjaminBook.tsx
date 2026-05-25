/*
 * Benjamin e o Robô — Livro Infantil Digital Premium
 * Design: Dark Enchanted Forest · Swiss Modernism
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  ArrowLeft,
  Star,
  ChevronLeft,
  ChevronRight,
  Heart,
  Sparkles,
} from "lucide-react";

// ─── Story Data ────────────────────────────────────────────────────────────────

const ACTS = [
  {
    id: 1,
    title: "O Quarto",
    emoji: "🌙",
    bg: "#030D1F",
    accent: "#4A9EFF",
    pages: [
      {
        image: "/manus-storage/ben-01-quarto-abraco_371ae0aa.png",
        lines: [
          "Benjamin tinha apenas seis anos.",
          "Seus cabelos eram bagunçados como vento brincando nas árvores.",
          "Seus olhos brilhavam de curiosidade.",
          "E suas covinhas apareciam sempre que ele sorria.",
        ],
        quote: null,
      },
      {
        image: "/manus-storage/ben-02-mae-beijo_d4d1d107.png",
        lines: [
          "Todas as noites, antes de dormir, Benjamin abraçava seu pequeno robô azul.",
          "Ele não era um robô comum.",
          "Tinha olhos brilhantes. Uma luz azul no peito.",
          "E parecia entender tudo o que Benjamin sentia.",
        ],
        quote: null,
      },
      {
        image: "/manus-storage/ben-03-pai-luz_6c0e5cca.png",
        lines: [
          "Naquela noite…",
          "A chuva caía devagar do lado de fora.",
          "A mamãe deu um beijo em sua testa.",
        ],
        quote: "— Boa noite, meu amor.",
      },
      {
        image: "/manus-storage/ben-04-dormindo-chuva_78334846.png",
        lines: [
          "O papai apagou a luz.",
          "E Benjamin adormeceu segurando o robô junto ao peito.",
          "Mas naquela noite…",
          "Algo mágico aconteceu. ✨",
        ],
        quote: null,
      },
    ],
  },
  {
    id: 2,
    title: "O Sonho Começa",
    emoji: "✨",
    bg: "#040F20",
    accent: "#7EB8FF",
    pages: [
      {
        image: "/manus-storage/ben-05-floresta-acordando_6dcdcc87.png",
        lines: [
          "Benjamin abriu os olhos lentamente.",
          "Só que não estava mais em seu quarto.",
          "Estava numa floresta gigantesca.",
        ],
        quote: null,
      },
      {
        image: "/manus-storage/ben-06-floresta-gigante_c1b0fc3c.png",
        lines: [
          "As árvores eram enormes.",
          "Os vagalumes brilhavam como pequenas estrelas.",
          "E o chão parecia iluminado por poeira mágica azul.",
        ],
        quote: null,
      },
      {
        image: "/manus-storage/ben-07-assustado-floresta_c056199a.png",
        lines: [
          "Benjamin olhou assustado para os lados.",
          "Então ouviu uma voz conhecida.",
        ],
        quote: "— Benjamin…",
      },
      {
        image: "/manus-storage/ben-15-robo-aparecendo_50893f4e.png",
        lines: [
          "Ele se virou rapidamente.",
          "Era seu robô.",
          "Mas agora… ele estava vivo.",
          "Seus olhos brilhavam em neon azul. Seus braços se mexiam sozinhos. E uma pequena antena piscava em sua cabeça metálica.",
        ],
        quote: null,
      },
    ],
  },
  {
    id: 3,
    title: "O Robô Real",
    emoji: "🤖",
    bg: "#030C18",
    accent: "#00BFFF",
    pages: [
      {
        image: "/manus-storage/ben-16-assustado-2_e5eadbec.png",
        lines: [
          "Benjamin abriu um sorriso enorme.",
        ],
        quote: "— Você é real?!",
      },
      {
        image: "/manus-storage/ben-08-robo-andando_b9d5c10e.png",
        lines: [
          "O robô sorriu.",
          "Os dois começaram a caminhar pela floresta.",
          "Enquanto andavam, ouviam sons estranhos.",
          "Folhas mexendo. Corujas cantando. Riachos brilhando.",
        ],
        quote: "— Neste lugar… tudo o que vem do coração é real.",
      },
    ],
  },
  {
    id: 4,
    title: "A Floresta Encantada",
    emoji: "🌲",
    bg: "#030E14",
    accent: "#3DFF9A",
    pages: [
      {
        image: "/manus-storage/ben-09-riacho-magico_943d85ec.png",
        lines: [
          "Até que…",
          "Um pequeno grito ecoou entre as árvores.",
          "Atrás de uma pedra havia um pequeno filhote luminoso tremendo de medo.",
          "Ele havia se perdido da mãe.",
        ],
        quote: null,
      },
      {
        image: "/manus-storage/ben-13-tres-juntos_f9b508d4.png",
        lines: [
          "Benjamin ajoelhou devagar.",
          "O robô olhou para Benjamin com orgulho.",
          "Então os três começaram uma jornada pela floresta encantada.",
        ],
        quote: "— Não tenha medo… eu vou te ajudar.",
      },
      {
        image: "/manus-storage/ben-14-tres-costas_071a93e1.png",
        lines: [
          "Mas quanto mais caminhavam…",
          "Mais escura a floresta ficava.",
        ],
        quote: null,
      },
    ],
  },
  {
    id: 5,
    title: "O Medo",
    emoji: "🌑",
    bg: "#07050A",
    accent: "#FF6B6B",
    pages: [
      {
        image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663072732590/fJ5hx6wkYJWuDqis7ykLHW/ben-18-sombra-medo-m7XuXduYctgXi6pUirAnNZ.webp",
        lines: [
          "De repente…",
          "Uma sombra gigante apareceu entre as árvores.",
          "Olhos vermelhos brilhavam no escuro.",
          "Benjamin sentiu medo. Muito medo.",
          "Seu coração batia rápido.",
          "Mas o robô segurou sua mão.",
        ],
        quote: "— Coragem não é não sentir medo… coragem é continuar mesmo com medo.",
      },
    ],
  },
  {
    id: 6,
    title: "O Final Mágico",
    emoji: "✨",
    bg: "#030A1A",
    accent: "#FFD700",
    pages: [
      {
        image: "/manus-storage/ben-11-mae-filhote-2_d9c43983.png",
        lines: [
          "Depois de atravessarem pontes quebradas…",
          "Cavernas iluminadas… E rios brilhantes…",
          "Finalmente encontraram a mãe do pequeno filhote.",
          "Ela abraçou o bebê emocionada.",
        ],
        quote: null,
      },
      {
        image: "/manus-storage/ben-10-mae-filhote_037b19f2.png",
        lines: [
          "A floresta inteira começou a brilhar.",
          "As árvores iluminaram. Os vagalumes voaram ao redor deles.",
          "E o céu se encheu de estrelas azuis.",
          "Então o robô olhou para Benjamin.",
        ],
        quote: "— Você passou no teste do coração.",
      },
      {
        image: "/manus-storage/ben-12-robo-desaparecendo_f18d45c8.png",
        lines: [
          "Tudo começou a desaparecer devagar.",
          "As árvores. As estrelas. A floresta. O robô.",
        ],
        quote: "— Espera! Você vai embora?!",
      },
      {
        image: "/manus-storage/ben-17-folha-azul_1d9554cb.png",
        lines: [
          "Benjamin abriu os olhos rapidamente.",
          "Estava novamente em seu quarto.",
          "A chuva ainda caía lá fora.",
          "Seu robô estava parado em seus braços… como um brinquedo normal.",
          "Mas então… ele percebeu algo.",
          "Em cima do travesseiro havia uma pequena folha azul brilhante da floresta.",
          "E naquele instante… Benjamin sorriu.",
          "Porque no fundo… ele sabia a verdade. ✨",
        ],
        quote: "— Sempre que você sonhar… eu estarei esperando.",
      },
    ],
  },
];

const ALL_PAGES = ACTS.flatMap((act) =>
  act.pages.map((page, i) => ({
    ...page,
    act,
    pageInAct: i,
    isFirstInAct: i === 0,
  }))
);

// ─── Animated Stars ────────────────────────────────────────────────────────────

function Stars({ count = 24 }: { count?: number }) {
  const stars = useRef(
    Array.from({ length: count }, () => ({
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: Math.random() * 2.5 + 0.8,
      delay: Math.random() * 3,
      duration: Math.random() * 3 + 2,
      opacity: Math.random() * 0.5 + 0.15,
    }))
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.current.map((s, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            background: "white",
            opacity: s.opacity,
            animation: `twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Cover Page ────────────────────────────────────────────────────────────────

function CoverPage({ onStart }: { onStart: () => void }) {
  return (
    <div
      className="relative w-full min-h-screen flex flex-col items-center justify-end overflow-hidden"
      style={{ background: "#030810" }}
    >
      <img
        src="https://d2xsxph8kpxj0f.cloudfront.net/310519663072732590/fJ5hx6wkYJWuDqis7ykLHW/ben-19-capa-alternativa-nRmziHeGAshvV7UgCvCdRz.webp"
        alt="Capa"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: "center 30%" }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(3,8,16,0.15) 0%, rgba(3,8,16,0.5) 45%, rgba(3,8,16,0.92) 72%, rgba(3,8,16,1) 100%)",
        }}
      />
      <Stars count={30} />

      <div className="absolute top-6 left-6 z-10">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{
            background: "rgba(30,144,255,0.18)",
            border: "1px solid rgba(30,144,255,0.35)",
            backdropFilter: "blur(8px)",
          }}
        >
          <Sparkles size={11} color="#4A9EFF" />
          <span
            style={{
              fontFamily: "Outfit, sans-serif",
              fontSize: 10,
              fontWeight: 700,
              color: "#4A9EFF",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            StoryBook Studio AI
          </span>
        </div>
      </div>

      <div className="relative z-10 w-full flex flex-col items-center text-center px-6 pb-16 gap-5 max-w-xl mx-auto">
        <div className="flex flex-col items-center gap-1">
          <p
            style={{
              fontFamily: "Outfit, sans-serif",
              fontSize: 12,
              fontWeight: 600,
              color: "#4A9EFF",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            Uma história de
          </p>
          <h1
            style={{
              fontFamily: "Fraunces, serif",
              fontSize: "clamp(38px, 9vw, 72px)",
              fontWeight: 900,
              color: "white",
              lineHeight: 1.0,
              textShadow: "0 4px 32px rgba(74,158,255,0.35)",
            }}
          >
            Benjamin
          </h1>
          <h2
            style={{
              fontFamily: "Fraunces, serif",
              fontSize: "clamp(22px, 5vw, 40px)",
              fontWeight: 400,
              fontStyle: "italic",
              color: "rgba(255,255,255,0.75)",
              lineHeight: 1.2,
            }}
          >
            e o Robô
          </h2>
        </div>

        <div className="flex items-center gap-3" style={{ width: "min(240px, 70vw)" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(74,158,255,0.3)" }} />
          <Star size={10} color="#4A9EFF" fill="#4A9EFF" />
          <div style={{ flex: 1, height: 1, background: "rgba(74,158,255,0.3)" }} />
        </div>

        <p
          style={{
            fontFamily: "Fraunces, serif",
            fontSize: "clamp(14px, 2.5vw, 17px)",
            fontStyle: "italic",
            color: "rgba(255,255,255,0.6)",
            lineHeight: 1.6,
            maxWidth: 320,
          }}
        >
          Uma história sobre coragem, amizade e a magia que vive dentro de cada sonho.
        </p>

        <div className="flex flex-wrap justify-center gap-2">
          {ACTS.map((act) => (
            <div
              key={act.id}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <span style={{ fontSize: 11 }}>{act.emoji}</span>
              <span
                style={{
                  fontFamily: "Outfit, sans-serif",
                  fontSize: 10,
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                {act.title}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={onStart}
          className="flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold transition-all"
          style={{
            background: "linear-gradient(135deg, #1E90FF 0%, #0050CC 100%)",
            color: "white",
            fontFamily: "Outfit, sans-serif",
            fontSize: 16,
            fontWeight: 700,
            boxShadow: "0 8px 32px rgba(30,144,255,0.45), 0 2px 8px rgba(0,0,0,0.4)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.04)";
            e.currentTarget.style.boxShadow = "0 12px 40px rgba(30,144,255,0.6), 0 2px 8px rgba(0,0,0,0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 8px 32px rgba(30,144,255,0.45), 0 2px 8px rgba(0,0,0,0.4)";
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1.04)")}
        >
          <BookOpen size={18} />
          Começar a história
        </button>

        <p
          style={{
            fontFamily: "Outfit, sans-serif",
            fontSize: 11,
            color: "rgba(255,255,255,0.28)",
          }}
        >
          {ALL_PAGES.length} páginas · 6 atos · Pixar Style
        </p>
      </div>
    </div>
  );
}

// ─── Book Page ─────────────────────────────────────────────────────────────────

function BookPage({
  page,
  pageIndex,
  total,
  visible,
}: {
  page: (typeof ALL_PAGES)[0];
  pageIndex: number;
  total: number;
  visible: boolean;
}) {
  const { act } = page;

  return (
    <div
      className="w-full min-h-screen"
      style={{
        background: act.bg,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(18px)",
        transition: "opacity 320ms cubic-bezier(0.23,1,0.32,1), transform 320ms cubic-bezier(0.23,1,0.32,1)",
      }}
    >
      <div className="hidden lg:flex w-full min-h-screen">
        <div className="w-[55%] relative" style={{ minHeight: "100vh" }}>
          <div className="sticky top-0 h-screen overflow-hidden">
            <img
              src={page.image}
              alt={`Página ${pageIndex + 1}`}
              className="w-full h-full object-cover"
              style={{ objectPosition: "center center" }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to right, transparent 70%, ${act.bg} 100%)`,
              }}
            />
            {page.isFirstInAct && (
              <div
                className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{
                  background: "rgba(0,0,0,0.55)",
                  backdropFilter: "blur(8px)",
                  border: `1px solid ${act.accent}40`,
                }}
              >
                <span style={{ fontSize: 13 }}>{act.emoji}</span>
                <span
                  style={{
                    fontFamily: "Outfit, sans-serif",
                    fontSize: 10,
                    fontWeight: 700,
                    color: act.accent,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Ato {act.id} — {act.title}
                </span>
              </div>
            )}
          </div>
        </div>

        <div
          className="w-[45%] flex flex-col justify-center px-12 py-16 gap-8"
          style={{ minHeight: "100vh" }}
        >
          <div className="flex items-center gap-3">
            <div style={{ width: 32, height: 2, background: act.accent, borderRadius: 2 }} />
            <span
              style={{
                fontFamily: "Outfit, sans-serif",
                fontSize: 11,
                fontWeight: 600,
                color: act.accent,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Página {pageIndex + 1} de {total}
            </span>
          </div>

          <div className="flex flex-col gap-5">
            {page.lines.map((line, i) => (
              <p
                key={i}
                style={{
                  fontFamily: "Fraunces, serif",
                  fontSize: "clamp(18px, 1.5vw, 24px)",
                  fontWeight: line.includes("…") || line.includes("Mas") ? 300 : 400,
                  fontStyle: line.includes("…") ? "italic" : "normal",
                  color: "rgba(255,255,255,0.85)",
                  lineHeight: 1.75,
                }}
              >
                {line}
              </p>
            ))}
          </div>

          {page.quote && (
            <div
              className="rounded-2xl px-6 py-5"
              style={{
                background: `${act.accent}12`,
                borderLeft: `3px solid ${act.accent}`,
              }}
            >
              <p
                style={{
                  fontFamily: "Fraunces, serif",
                  fontSize: "clamp(18px, 1.6vw, 26px)",
                  fontWeight: 600,
                  fontStyle: "italic",
                  color: act.accent,
                  lineHeight: 1.5,
                }}
              >
                {page.quote}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:hidden w-full">
        <div className="relative w-full" style={{ height: "72vh", minHeight: 320 }}>
          <img
            src={page.image}
            alt={`Página ${pageIndex + 1}`}
            className="w-full h-full object-cover"
            style={{ objectPosition: "center center" }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom, transparent 55%, ${act.bg}BB 85%, ${act.bg} 100%)`,
            }}
          />
          {page.isFirstInAct && (
            <div
              className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{
                background: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(8px)",
                border: `1px solid ${act.accent}40`,
              }}
            >
              <span style={{ fontSize: 12 }}>{act.emoji}</span>
              <span
                style={{
                  fontFamily: "Outfit, sans-serif",
                  fontSize: 10,
                  fontWeight: 700,
                  color: act.accent,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Ato {act.id} — {act.title}
              </span>
            </div>
          )}
          <div
            className="absolute top-4 right-4 px-2.5 py-1 rounded-full"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          >
            <span style={{ fontFamily: "Outfit, sans-serif", fontSize: 10, color: "rgba(255,255,255,0.55)" }}>
              {pageIndex + 1} / {total}
            </span>
          </div>
        </div>

        <div className="px-5 pt-5 pb-28 flex flex-col gap-4 max-w-xl mx-auto w-full">
          {page.lines.map((line, i) => (
            <p
              key={i}
              style={{
                fontFamily: "Fraunces, serif",
                fontSize: "clamp(17px, 4vw, 22px)",
                fontWeight: line.includes("…") ? 300 : 400,
                fontStyle: line.includes("…") ? "italic" : "normal",
                color: "rgba(255,255,255,0.85)",
                lineHeight: 1.75,
              }}
            >
              {line}
            </p>
          ))}
          {page.quote && (
            <div
              className="rounded-2xl px-5 py-4 mt-2"
              style={{ background: `${act.accent}14`, borderLeft: `3px solid ${act.accent}` }}
            >
              <p
                style={{
                  fontFamily: "Fraunces, serif",
                  fontSize: "clamp(17px, 4vw, 22px)",
                  fontWeight: 600,
                  fontStyle: "italic",
                  color: act.accent,
                  lineHeight: 1.5,
                }}
              >
                {page.quote}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── End Page ──────────────────────────────────────────────────────────────────

function EndPage({ onRestart }: { onRestart: () => void }) {
  return (
    <div
      className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "#030D1A" }}
    >
      <img
        src="/manus-storage/ben-17-folha-azul_1d9554cb.png"
        alt="Fim"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.45, objectPosition: "center 30%" }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(3,13,26,0.4) 0%, rgba(3,13,26,0.75) 50%, rgba(3,13,26,0.97) 100%)",
        }}
      />
      <Stars count={40} />

      <div className="relative z-10 flex flex-col items-center text-center px-6 gap-6 max-w-md">
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 72,
            height: 72,
            background: "rgba(30,144,255,0.12)",
            border: "2px solid rgba(30,144,255,0.35)",
            boxShadow: "0 0 32px rgba(30,144,255,0.2)",
          }}
        >
          <Heart size={30} color="#4A9EFF" fill="#4A9EFF" />
        </div>

        <h2
          style={{
            fontFamily: "Fraunces, serif",
            fontSize: "clamp(36px, 8vw, 64px)",
            fontWeight: 900,
            color: "white",
            lineHeight: 1.0,
            textShadow: "0 4px 32px rgba(74,158,255,0.3)",
          }}
        >
          Fim ✨
        </h2>

        <p
          style={{
            fontFamily: "Fraunces, serif",
            fontSize: "clamp(16px, 3vw, 22px)",
            fontStyle: "italic",
            color: "rgba(255,255,255,0.65)",
            lineHeight: 1.7,
          }}
        >
          "Sempre que você sonhar… eu estarei esperando."
        </p>

        <div className="flex items-center gap-3" style={{ width: "min(260px, 75vw)" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(74,158,255,0.25)" }} />
          <Star size={10} color="#4A9EFF" fill="#4A9EFF" />
          <div style={{ flex: 1, height: 1, background: "rgba(74,158,255,0.25)" }} />
        </div>

        <p style={{ fontFamily: "Outfit, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
          Uma história de coragem, amizade e sonhos.
        </p>

        <div className="flex flex-wrap justify-center gap-3 mt-2">
          <button
            onClick={onRestart}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all"
            style={{
              background: "rgba(30,144,255,0.15)",
              border: "1px solid rgba(30,144,255,0.4)",
              color: "#4A9EFF",
              fontFamily: "Outfit, sans-serif",
              fontSize: 14,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(30,144,255,0.25)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(30,144,255,0.15)")}
          >
            <BookOpen size={16} />
            Ler novamente
          </button>
          <Link to="/storybook">
            <button
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.14)",
                color: "rgba(255,255,255,0.65)",
                fontFamily: "Outfit, sans-serif",
                fontSize: 14,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
            >
              <ArrowLeft size={16} />
              Voltar ao Studio
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Navigation Bar ────────────────────────────────────────────────────────────

function NavBar({
  currentPage,
  total,
  onPrev,
  onNext,
  onCover,
  act,
}: {
  currentPage: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onCover: () => void;
  act: (typeof ACTS)[0] | null;
}) {
  const progress = ((currentPage + 1) / total) * 100;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "rgba(3,8,16,0.88)",
        backdropFilter: "blur(16px)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div style={{ height: 2, background: "rgba(255,255,255,0.07)" }}>
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: act?.accent ?? "#4A9EFF",
            transition: "width 350ms cubic-bezier(0.23,1,0.32,1)",
            boxShadow: `0 0 8px ${act?.accent ?? "#4A9EFF"}80`,
          }}
        />
      </div>

      <div className="flex items-center justify-between px-4 py-3 max-w-3xl mx-auto">
        <button
          onClick={onCover}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors"
          style={{ color: "rgba(255,255,255,0.45)", fontFamily: "Outfit, sans-serif", fontSize: 12 }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <ArrowLeft size={14} />
          <span className="hidden sm:inline">Capa</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={onPrev}
            disabled={currentPage <= 0}
            className="flex items-center justify-center rounded-full transition-all disabled:opacity-25"
            style={{
              width: 38,
              height: 38,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.background = "rgba(255,255,255,0.14)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
          >
            <ChevronLeft size={18} color="white" />
          </button>

          <div className="flex flex-col items-center" style={{ minWidth: 64 }}>
            <span style={{ fontFamily: "Outfit, sans-serif", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
              {currentPage + 1} / {total}
            </span>
            <span
              style={{
                fontFamily: "Outfit, sans-serif",
                fontSize: 9,
                color: act?.accent ?? "#4A9EFF",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {act?.emoji} {act?.title}
            </span>
          </div>

          <button
            onClick={onNext}
            disabled={currentPage >= total - 1}
            className="flex items-center justify-center rounded-full transition-all disabled:opacity-25"
            style={{
              width: 38,
              height: 38,
              background: act?.accent ?? "#4A9EFF",
              boxShadow: `0 4px 16px ${act?.accent ?? "#4A9EFF"}50`,
            }}
            onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.transform = "scale(1.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
          >
            <ChevronRight size={18} color="white" />
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-1.5">
          {ACTS.map((a) => (
            <div
              key={a.id}
              title={`Ato ${a.id}: ${a.title}`}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: a.id === act?.id ? a.accent : "rgba(255,255,255,0.18)",
                transition: "background 300ms ease",
                boxShadow: a.id === act?.id ? `0 0 6px ${a.accent}` : "none",
              }}
            />
          ))}
        </div>

        <div className="flex sm:hidden items-center">
          <span style={{ fontSize: 18 }}>{act?.emoji ?? "📖"}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Book Component ───────────────────────────────────────────────────────

export default function BenjaminBook() {
  const [view, setView] = useState<"cover" | "reading" | "end">("cover");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageVisible, setPageVisible] = useState(true);
  const topRef = useRef<HTMLDivElement>(null);

  const currentPageData = ALL_PAGES[currentPage];
  const currentAct = currentPageData?.act ?? null;

  const changePage = useCallback((newPage: number) => {
    setPageVisible(false);
    setTimeout(() => {
      setCurrentPage(newPage);
      setPageVisible(true);
      topRef.current?.scrollIntoView({ behavior: "instant" });
    }, 180);
  }, []);

  const goNext = useCallback(() => {
    if (currentPage < ALL_PAGES.length - 1) {
      changePage(currentPage + 1);
    } else {
      setPageVisible(false);
      setTimeout(() => {
        setView("end");
        setPageVisible(true);
        topRef.current?.scrollIntoView({ behavior: "instant" });
      }, 180);
    }
  }, [currentPage, changePage]);

  const goPrev = useCallback(() => {
    if (currentPage > 0) changePage(currentPage - 1);
  }, [currentPage, changePage]);

  const goToCover = useCallback(() => {
    setView("cover");
    setCurrentPage(0);
    topRef.current?.scrollIntoView({ behavior: "instant" });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (view !== "reading") return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        goNext();
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [view, goNext, goPrev]);

  return (
    <div ref={topRef} className="min-h-screen" style={{ background: "#030810" }}>
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.4); }
        }
      `}</style>

      {view === "cover" && (
        <CoverPage
          onStart={() => {
            setCurrentPage(0);
            setView("reading");
            setPageVisible(true);
          }}
        />
      )}

      {view === "reading" && currentPageData && (
        <>
          <BookPage
            page={currentPageData}
            pageIndex={currentPage}
            total={ALL_PAGES.length}
            visible={pageVisible}
          />

          <div className="fixed inset-0 z-40 flex lg:hidden" style={{ pointerEvents: "none" }}>
            <div
              className="flex-1 h-full"
              style={{ pointerEvents: "auto", cursor: "w-resize" }}
              onClick={goPrev}
            />
            <div style={{ width: "30%" }} />
            <div
              className="flex-1 h-full"
              style={{ pointerEvents: "auto", cursor: "e-resize" }}
              onClick={goNext}
            />
          </div>

          <div style={{ paddingBottom: 80 }} />

          <NavBar
            currentPage={currentPage}
            total={ALL_PAGES.length}
            onPrev={goPrev}
            onNext={goNext}
            onCover={goToCover}
            act={currentAct}
          />
        </>
      )}

      {view === "end" && (
        <EndPage
          onRestart={() => {
            setCurrentPage(0);
            setView("reading");
            setPageVisible(true);
          }}
        />
      )}
    </div>
  );
}
