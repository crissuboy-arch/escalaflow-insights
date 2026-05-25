/**
 * CristianeBook.tsx — Livro de Superação "Desistir Não Era Uma Opção"
 * Design: Dark Premium — fundo #050A14, dourado #C9A84C, branco #F0F4FF
 * Tipografia: Fraunces (títulos), Outfit (corpo)
 */

import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronLeft, ChevronRight, BookOpen, Star } from "lucide-react";

const FOTO1 = "/manus-storage/cristiane-foto1_1eeac7e1.png";
const FOTO2 = "/manus-storage/cristiane-foto2_4eb1216d.png";
const FOTO3 = "/manus-storage/cristiane-foto3_8f8d0589.png";
const ASSINATURA = "/manus-storage/cristiane-assinatura_70bc2ecb.png";

type Page = {
  id: number;
  chapter?: string;
  title?: string;
  text: string[];
  image?: string;
  imagePosition?: "left" | "right" | "full" | "center";
  highlight?: string;
  isCover?: boolean;
  isSignature?: boolean;
  accentColor?: string;
};

const pages: Page[] = [
  {
    id: 0,
    isCover: true,
    text: [],
    image: FOTO1,
    accentColor: "#C9A84C",
  },
  {
    id: 1,
    chapter: "Capítulo 1",
    title: "Quem Sou Eu",
    text: [
      "Eu me chamo Cristiane Silva.",
      "Tenho 40 anos. Sou brasileira, do estado do Pará.",
      "Durante muitos anos da minha vida trabalhei com vendas, pessoas, liderança e equipes. Sempre fui movida pela vontade de crescer, aprender e construir algo maior.",
      "Sou mãe de dois filhos. Minha filha Isabela nasceu no Brasil. Meu filho Benjamin nasceu em Portugal.",
    ],
    image: FOTO2,
    imagePosition: "right",
    accentColor: "#C9A84C",
  },
  {
    id: 2,
    chapter: "Capítulo 2",
    title: "A Grande Decisão",
    text: [
      "Em 2019, tomei uma das decisões mais difíceis da minha vida:",
      "Sair do meu país para recomeçar na Europa.",
      "Como muitos brasileiros, cheguei cheia de sonhos… mas também cheia de medos.",
      "Então veio a pandemia. O mundo parou. Portugal parou. O Brasil sofreu. As pessoas mudaram. E eu também.",
    ],
    highlight: "Sair do meu país para recomeçar na Europa.",
    image: FOTO3,
    imagePosition: "left",
    accentColor: "#C9A84C",
  },
  {
    id: 3,
    chapter: "Capítulo 3",
    title: "Um Novo Universo",
    text: [
      "Meu filho ainda era pequeno quando comecei a ver algo novo crescendo diante dos meus olhos: o marketing digital.",
      "Eu via pessoas falando sobre dropshipping, infoprodutos, internet, vendas online, inteligência artificial.",
      "Mas sinceramente? Eu não entendia absolutamente nada. Parecia outro universo.",
      "Eu assistia vídeos… tentava aprender… e me sentia perdida. Às vezes achava que aquilo não era para mim.",
    ],
    highlight: "Mas algo dentro de mim dizia: Continua.",
    accentColor: "#2563EB",
  },
  {
    id: 4,
    chapter: "Capítulo 4",
    title: "A Virada na França",
    text: [
      "Em 2024, fui passar uma temporada na França.",
      "E foi lá que algo mudou dentro da minha mente.",
      "Comecei a estudar com mais profundidade: sites, aplicativos, softwares, automações, inteligência artificial.",
      "E então… minha mente explodiu.",
    ],
    highlight: "Foi como descobrir um novo mundo.",
    image: FOTO1,
    imagePosition: "right",
    accentColor: "#C9A84C",
  },
  {
    id: 5,
    chapter: "Capítulo 5",
    title: "Mergulho Profundo",
    text: [
      "Um mundo onde ideias poderiam virar projetos. Onde criatividade poderia virar negócio. Onde pessoas comuns poderiam construir coisas extraordinárias.",
      "E foi exatamente isso que comecei a fazer.",
      "Mergulhei profundamente nesse universo.",
      "Errei. Aprendi. Recomecei. Passei noites estudando. Fiquei perdida muitas vezes. Mas continuei.",
    ],
    image: FOTO2,
    imagePosition: "left",
    accentColor: "#C9A84C",
  },
  {
    id: 6,
    chapter: "Capítulo 6",
    title: "O Que Construí",
    text: [
      "Hoje, esse já é o meu terceiro grande projeto.",
      "E mais importante do que resultados financeiros… é olhar para trás e perceber o quanto eu evoluí como mulher, mãe e ser humano.",
      "Sou extremamente grata pela minha família, pelos meus filhos, pelas pessoas que acreditaram em mim, e principalmente por não ter desistido de mim mesma.",
    ],
    highlight: "Olhar para trás e perceber o quanto eu evoluí.",
    image: FOTO3,
    imagePosition: "right",
    accentColor: "#C9A84C",
  },
  {
    id: 7,
    chapter: "Mensagem Final",
    title: "Para Quem Está Começando",
    text: [
      "Se eu pudesse deixar uma mensagem para qualquer pessoa que está começando do zero hoje, eu diria:",
      "Não se sinta inferior. Não se sinta burro por não entender algo novo.",
      "Nós nascemos sem saber andar, falar, escrever, viver. E aprendemos tudo isso.",
      "Então você também pode aprender uma nova profissão. Você também pode recomeçar. Você também pode mudar sua vida.",
      "Nunca pense que já passou da idade. Nunca pense que é tarde demais. Porque não é.",
      "O mundo muda todos os dias. E nós também podemos mudar.",
    ],
    highlight: "Modele. Aprenda. Recomece. Faça sua história acontecer.",
    accentColor: "#2563EB",
  },
  {
    id: 8,
    isSignature: true,
    text: [],
    image: ASSINATURA,
    accentColor: "#C9A84C",
  },
];

export default function CristianeBook() {
  const [currentPage, setCurrentPage] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const bookRef = useRef<HTMLDivElement>(null);

  const goTo = (idx: number, dir: "next" | "prev") => {
    if (animating || idx < 0 || idx >= pages.length) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setCurrentPage(idx);
      setAnimating(false);
      bookRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, 280);
  };

  const page = pages[currentPage];
  const progress = ((currentPage) / (pages.length - 1)) * 100;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goTo(currentPage + 1, "next");
      if (e.key === "ArrowLeft") goTo(currentPage - 1, "prev");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentPage, animating]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #050A14 0%, #0A0F1E 50%, #080D1A 100%)",
        fontFamily: "Outfit, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
          borderBottom: "1px solid #1E2D4A",
          background: "rgba(8,13,26,0.95)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <Link to="/storybook">
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#C9A84C",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: "Outfit, sans-serif",
              fontSize: 14,
              fontWeight: 500,
              padding: "6px 12px",
              borderRadius: 8,
              transition: "background 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(201,168,76,0.1)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <ArrowLeft size={16} />
            Voltar ao Studio
          </button>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BookOpen size={18} color="#C9A84C" />
          <span style={{ color: "#F0F4FF", fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 600 }}>
            Desistir Não Era Uma Opção
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#6B7FA8", fontSize: 13 }}>
            {currentPage + 1} / {pages.length}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: "#1E2D4A", position: "relative" }}>
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "linear-gradient(90deg, #C9A84C, #E8C96A)",
            transition: "width 0.4s ease",
            borderRadius: "0 2px 2px 0",
          }}
        />
      </div>

      {/* Chapter dots */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 8,
          padding: "12px 0 0",
        }}
      >
        {pages.map((p, i) => (
          <button
            key={p.id}
            onClick={() => goTo(i, i > currentPage ? "next" : "prev")}
            title={p.chapter || (p.isCover ? "Capa" : "Assinatura")}
            style={{
              width: i === currentPage ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background: i === currentPage ? "#C9A84C" : i < currentPage ? "#2563EB" : "#1E2D4A",
              border: "none",
              cursor: "pointer",
              transition: "all 0.3s ease",
              padding: 0,
            }}
          />
        ))}
      </div>

      {/* Book content */}
      <div
        ref={bookRef}
        style={{
          flex: 1,
          overflow: "auto",
          padding: "32px 24px 48px",
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            opacity: animating ? 0 : 1,
            transform: animating
              ? `translateX(${direction === "next" ? "40px" : "-40px"})`
              : "translateX(0)",
            transition: "opacity 0.28s ease, transform 0.28s ease",
          }}
        >
          {/* CAPA */}
          {page.isCover && (
            <div
              style={{
                borderRadius: 20,
                overflow: "hidden",
                position: "relative",
                minHeight: 600,
                display: "flex",
                alignItems: "flex-end",
                border: "1px solid #2A3A5A",
                boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,168,76,0.15)",
              }}
            >
              <img
                src={page.image}
                alt="Cristiane Silva"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center top",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(to top, rgba(5,10,20,0.97) 0%, rgba(5,10,20,0.7) 40%, rgba(5,10,20,0.1) 70%, transparent 100%)",
                }}
              />
              <div style={{ position: "relative", zIndex: 2, padding: "48px 48px 56px", width: "100%" }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "rgba(201,168,76,0.15)",
                    border: "1px solid rgba(201,168,76,0.3)",
                    borderRadius: 20,
                    padding: "4px 14px",
                    marginBottom: 20,
                  }}
                >
                  <Star size={12} color="#C9A84C" fill="#C9A84C" />
                  <span style={{ color: "#C9A84C", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    História de Superação
                  </span>
                </div>
                <h1
                  style={{
                    fontFamily: "Fraunces, serif",
                    fontSize: "clamp(32px, 5vw, 56px)",
                    fontWeight: 900,
                    color: "#F0F4FF",
                    lineHeight: 1.1,
                    marginBottom: 16,
                    textShadow: "0 2px 20px rgba(0,0,0,0.8)",
                  }}
                >
                  Desistir Não Era<br />
                  <span style={{ color: "#C9A84C" }}>Uma Opção</span>
                </h1>
                <p
                  style={{
                    color: "#A0B0CC",
                    fontSize: 18,
                    fontFamily: "Outfit, sans-serif",
                    fontWeight: 300,
                    letterSpacing: "0.05em",
                  }}
                >
                  por <span style={{ color: "#C9A84C", fontWeight: 600 }}>Cristiane Silva</span>
                </p>
              </div>
            </div>
          )}

          {/* ASSINATURA */}
          {page.isSignature && (
            <div
              style={{
                borderRadius: 20,
                overflow: "hidden",
                background: "#050A14",
                border: "1px solid rgba(201,168,76,0.2)",
                boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(201,168,76,0.05)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 600,
                padding: "64px 48px",
                gap: 40,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16, width: "100%", maxWidth: 500 }}>
                <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, rgba(201,168,76,0.4))" }} />
                <Star size={16} color="#C9A84C" fill="#C9A84C" />
                <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, rgba(201,168,76,0.4))" }} />
              </div>

              <div style={{ textAlign: "center", maxWidth: 600 }}>
                <p
                  style={{
                    fontFamily: "Fraunces, serif",
                    fontSize: "clamp(20px, 3vw, 30px)",
                    fontWeight: 700,
                    color: "#F0F4FF",
                    lineHeight: 1.5,
                    marginBottom: 12,
                  }}
                >
                  Porque desistir…
                </p>
                <p
                  style={{
                    fontFamily: "Fraunces, serif",
                    fontSize: "clamp(24px, 4vw, 40px)",
                    fontWeight: 900,
                    color: "#C9A84C",
                    lineHeight: 1.2,
                    textShadow: "0 0 40px rgba(201,168,76,0.3)",
                  }}
                >
                  Nunca foi uma opção.
                </p>
              </div>

              <div
                style={{
                  background: "#050A14",
                  borderRadius: 16,
                  padding: "8px 24px",
                  maxWidth: 480,
                  width: "100%",
                }}
              >
                <img
                  src={ASSINATURA}
                  alt="Cristiane Silva — Autora"
                  style={{ width: "100%", objectFit: "contain", maxHeight: 200 }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 16, width: "100%", maxWidth: 500 }}>
                <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, rgba(201,168,76,0.4))" }} />
                <Star size={16} color="#C9A84C" fill="#C9A84C" />
                <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, rgba(201,168,76,0.4))" }} />
              </div>

              <p style={{ color: "#6B7FA8", fontSize: 13, textAlign: "center", fontStyle: "italic" }}>
                Liderança · Propósito · Transformação
              </p>
            </div>
          )}

          {/* PÁGINAS NORMAIS */}
          {!page.isCover && !page.isSignature && (
            <div
              style={{
                borderRadius: 20,
                border: "1px solid #1E2D4A",
                background: "#0A0F1E",
                overflow: "hidden",
                boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
              }}
            >
              <div
                style={{
                  padding: "28px 40px 20px",
                  borderBottom: "1px solid #1E2D4A",
                  background: "rgba(201,168,76,0.03)",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    background: `rgba(${page.accentColor === "#C9A84C" ? "201,168,76" : "37,99,235"},0.12)`,
                    border: `1px solid ${page.accentColor === "#C9A84C" ? "rgba(201,168,76,0.3)" : "rgba(37,99,235,0.3)"}`,
                    borderRadius: 20,
                    padding: "4px 14px",
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      color: page.accentColor,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    {page.chapter}
                  </span>
                </div>
                <h2
                  style={{
                    fontFamily: "Fraunces, serif",
                    fontSize: "clamp(22px, 3vw, 36px)",
                    fontWeight: 800,
                    color: "#F0F4FF",
                    lineHeight: 1.2,
                    margin: 0,
                  }}
                >
                  {page.title}
                </h2>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: page.image && page.imagePosition === "left" ? "row-reverse" : "row",
                  gap: 0,
                  minHeight: 400,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    padding: "36px 40px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                    justifyContent: "center",
                  }}
                >
                  {page.text.map((t, i) => (
                    <p
                      key={i}
                      style={{
                        color: "#C8D8F0",
                        fontSize: 16,
                        lineHeight: 1.8,
                        margin: 0,
                        fontFamily: "Outfit, sans-serif",
                        fontWeight: 300,
                      }}
                    >
                      {t}
                    </p>
                  ))}

                  {page.highlight && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: "20px 24px",
                        borderLeft: `4px solid ${page.accentColor}`,
                        background: `rgba(${page.accentColor === "#C9A84C" ? "201,168,76" : "37,99,235"},0.07)`,
                        borderRadius: "0 12px 12px 0",
                      }}
                    >
                      <p
                        style={{
                          fontFamily: "Fraunces, serif",
                          fontSize: 18,
                          fontWeight: 700,
                          color: page.accentColor,
                          margin: 0,
                          lineHeight: 1.5,
                          fontStyle: "italic",
                        }}
                      >
                        ✨ {page.highlight}
                      </p>
                    </div>
                  )}
                </div>

                {page.image && (
                  <div
                    style={{
                      width: "40%",
                      minWidth: 260,
                      position: "relative",
                      overflow: "hidden",
                      borderLeft: page.imagePosition !== "left" ? "1px solid #1E2D4A" : "none",
                      borderRight: page.imagePosition === "left" ? "1px solid #1E2D4A" : "none",
                    }}
                  >
                    <img
                      src={page.image}
                      alt="Cristiane Silva"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "center top",
                        display: "block",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          page.imagePosition === "right"
                            ? "linear-gradient(to right, rgba(10,15,30,0.5) 0%, transparent 40%)"
                            : "linear-gradient(to left, rgba(10,15,30,0.5) 0%, transparent 40%)",
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px 24px",
          borderTop: "1px solid #1E2D4A",
          background: "rgba(8,13,26,0.95)",
        }}
      >
        <button
          onClick={() => goTo(currentPage - 1, "prev")}
          disabled={currentPage === 0}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            borderRadius: 10,
            border: "1px solid #1E2D4A",
            background: currentPage === 0 ? "transparent" : "#0D1526",
            color: currentPage === 0 ? "#2A3A5A" : "#C9A84C",
            cursor: currentPage === 0 ? "not-allowed" : "pointer",
            fontFamily: "Outfit, sans-serif",
            fontSize: 14,
            fontWeight: 500,
            transition: "all 0.15s",
          }}
        >
          <ChevronLeft size={18} />
          Anterior
        </button>

        <div style={{ textAlign: "center" }}>
          {!page.isCover && !page.isSignature && (
            <p style={{ color: "#6B7FA8", fontSize: 13, margin: 0 }}>
              {page.chapter} — {page.title}
            </p>
          )}
          {page.isCover && (
            <p style={{ color: "#C9A84C", fontSize: 13, margin: 0, fontStyle: "italic" }}>
              Capa do Livro
            </p>
          )}
          {page.isSignature && (
            <p style={{ color: "#C9A84C", fontSize: 13, margin: 0, fontStyle: "italic" }}>
              Assinatura da Autora
            </p>
          )}
        </div>

        <button
          onClick={() => goTo(currentPage + 1, "next")}
          disabled={currentPage === pages.length - 1}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            borderRadius: 10,
            border: "1px solid #C9A84C",
            background: currentPage === pages.length - 1 ? "transparent" : "rgba(201,168,76,0.1)",
            color: currentPage === pages.length - 1 ? "#2A3A5A" : "#C9A84C",
            cursor: currentPage === pages.length - 1 ? "not-allowed" : "pointer",
            fontFamily: "Outfit, sans-serif",
            fontSize: 14,
            fontWeight: 600,
            transition: "all 0.15s",
          }}
        >
          Próximo
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
