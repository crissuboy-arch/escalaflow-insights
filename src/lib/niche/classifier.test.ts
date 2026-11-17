import { describe, it, expect } from "vitest";
import { classifyNiche, hasTerm, tokenize, storedNicheLabel, NICHE_LABEL } from "./classifier";
import { categoriesOf, inferTagsFromText } from "@/lib/mining/keywords";

const legacyTags = ["Cristão", "Relacionamento", "Automação", "Hook repetido", "Padrão de copy"];

describe("casos reais da Biblioteca", () => {
  it("anti-caspa (Flakes) → beleza", () => {
    const r = classifyNiche({
      headline: "End Dandruff Forever.",
      advertiser: "Flakes",
      tags: legacyTags,
      declaredNiche: "Geral",
    });
    expect(r.niche).toBe("beleza");
  });

  it("máscara de cílios → beleza, não saúde", () => {
    const r = classifyNiche({
      headline: "Find Your Perfect Mascara Shade",
      advertiser: "Prime Prometics",
      tags: legacyTags,
    });
    expect(r.niche).toBe("beleza");
    expect(r.scores.saude).toBeUndefined();
  });

  it("mini-série de drama com keyword 'renda extra' → entretenimento", () => {
    for (const advertiser of ["Minute Tales", "Binge Picks"]) {
      const r = classifyNiche({
        headline: "O CEO que Sentiu Minha Gravidez",
        advertiser,
        keyword: "renda extra",
        tags: legacyTags,
        declaredNiche: "Geral",
      });
      expect(r.niche).toBe("entretenimento");
    }
  });

  it("herrería → diy", () => {
    const r = classifyNiche({
      headline: "🔥 +4.000 Proyectos de Herrería",
      copy: "El Pack que Todo Herrero Necesita ... proyectos de herrería ... portones, rejas, remolques, estructuras, muebles",
      tags: legacyTags,
    });
    expect(r.niche).toBe("diy");
  });

  it("Palaces Group Education → educação", () => {
    expect(
      classifyNiche({
        headline: "MANUAL VISUAL DEL INGENIERO QUÍMICO/INDUSTRIAL/DE DATOS",
        advertiser: "Palaces Group Education",
      }).niche,
    ).toBe("educacao");
    expect(
      classifyNiche({
        headline: "¿ESTUDIAS O TRABAJAS EN CONSTRUCCIÓN...",
        advertiser: "Palaces Group Education",
      }).niche,
    ).toBe("educacao");
  });

  it("curso de inglês → educação", () => {
    const r = classifyNiche({
      headline: "English Confidence.",
      copy: "Do you sound as successful as you actually are? ... the way you speak",
      advertiser: "Flip English Course",
    });
    expect(r.niche).toBe("educacao");
  });
});

describe("sinais fracos não decidem", () => {
  it("só a keyword de pesquisa não chega", () => {
    expect(classifyNiche({ headline: "Oferta especial", keyword: "renda extra" }).niche).toBe(
      "outros",
    );
  });
  it("tags antigas do enriquecimento são ignoradas", () => {
    expect(classifyNiche({ headline: "Olá", tags: legacyTags }).niche).toBe("outros");
  });
  it("nicho declarado 'Geral' é ignorado", () => {
    expect(classifyNiche({ headline: "Olá", declaredNiche: "Geral" }).niche).toBe("outros");
  });
});

describe("sem falsos positivos por substring", () => {
  it("godfather / Godzilla não são religiosos", () => {
    expect(classifyNiche({ headline: "The Godfather meets Godzilla tonight" }).niche).not.toBe(
      "religioso",
    );
    expect(hasTerm("Godzilla", "god")).toBe(false);
    expect(hasTerm("Thank God", "god")).toBe(true);
  });
  it("website / copyright não são marketing", () => {
    const r = classifyNiche({
      headline: "Visit our website",
      copy: "Copyright 2024. All rights reserved.",
    });
    expect(r.niche).not.toBe("marketing");
  });
  it("'café' não é 'fé'; 'exemplo' não é 'ex'", () => {
    expect(classifyNiche({ headline: "O melhor café, por exemplo" }).niche).toBe("outros");
    expect(categoriesOf("O melhor café, por exemplo")).toEqual([]);
  });
  it("mãe só casa com a palavra inteira", () => {
    expect(hasTerm("Presente para a mãe", "mae")).toBe(true);
    expect(hasTerm("maestro e maestria", "mae")).toBe(false);
    expect(classifyNiche({ headline: "Dicas para mães de primeira viagem" }).niche).toBe(
      "infantil",
    );
  });
  it("radical só onde é explícito", () => {
    expect(hasTerm("Emagreça rápido", "emagrec*")).toBe(true);
    expect(hasTerm("salmon recipes", "salmo")).toBe(false);
  });
  it("tokeniza sem acentos e com frases", () => {
    expect(tokenize("Perca PESO já!")).toEqual(["perca", "peso", "ja"]);
    expect(hasTerm("como perder   peso", "perder peso")).toBe(true);
    expect(hasTerm("perder o peso", "perder peso")).toBe(false);
  });
});

describe("nichos existentes (pt/es/en/fr)", () => {
  const cases: [string, string][] = [
    ["saude", "Emagreça 5kg sem passar fome e perca peso"],
    ["saude", "Cómo bajar de peso sin dietas"],
    ["saude", "The weight loss method doctors love"],
    ["saude", "Maigrir sans régime"],
    ["renda", "Ganhe dinheiro com renda extra"],
    ["renda", "Gana dinero desde casa con ingresos extra"],
    ["renda", "Build passive income and make money online"],
    ["renda", "Gagner de l'argent avec des revenus passifs"],
    ["relacionamento", "Reconquiste seu ex em 7 dias"],
    ["relacionamento", "Recupera a tu ex y salva tu pareja"],
    ["relacionamento", "Get your ex back: dating secrets"],
    ["relacionamento", "Reconquérir votre ex et sauver votre couple"],
    ["religioso", "Devocional diário: 365 orações e a Bíblia"],
    ["religioso", "Oración diaria para acercarte a Dios"],
    ["religioso", "Daily prayer to grow your faith in God"],
    ["religioso", "Prière quotidienne : la Bible et la foi"],
  ];
  for (const [niche, headline] of cases) {
    it(`${niche}: ${headline}`, () => {
      expect(classifyNiche({ headline }).niche).toBe(niche);
    });
  }
});

describe("rótulos", () => {
  it("guarda 'Geral' para outros e o rótulo para os restantes", () => {
    expect(storedNicheLabel("outros")).toBe("Geral");
    expect(storedNicheLabel("diy")).toBe(NICHE_LABEL.diy);
    expect(NICHE_LABEL.entretenimento).toBe("Entretenimento & Séries");
  });
});

describe("etiquetador (raw.enriched.tags)", () => {
  it("não etiqueta Cristão/Relacionamento/Automação por substring", () => {
    const { tags } = inferTagsFromText(
      "End Dandruff Forever. Feito com café, por exemplo, para quem faz makeup.",
    );
    expect(tags).not.toContain("Cristão");
    expect(tags).not.toContain("Relacionamento");
    expect(tags).not.toContain("Automação");
  });
  it("continua a etiquetar o que é real", () => {
    expect(categoriesOf("Devocional com fé e oração")).toContain("cristao");
    expect(categoriesOf("Como reconquistar seu ex")).toContain("relacionamento");
  });
});
