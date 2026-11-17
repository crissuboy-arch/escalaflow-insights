import { describe, it, expect } from "vitest";
import {
  classifyNiche,
  cleanTextField,
  hasTerm,
  tokenize,
  storedNicheLabel,
  NICHE_LABEL,
  NICHE_EMOJI,
} from "./classifier";
import { NICHES } from "@/lib/library/offers";
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

describe("refinamento: falsos positivos do dry run", () => {
  it("Amy Wright (probióticos, colonoscopia, inchaço) → saude, não infantil", () => {
    const r = classifyNiche({
      advertiser: "Amy Wright",
      headline:
        "3 probiotics, 2 elimination diets, and a colonoscopy. Still bloated after every meal.",
      copy: "My friend Nina swore it was because I was pregnant once. It wasn't. The bloating started years later and no doctor could explain it.",
    });
    expect(r.niche).toBe("saude");
    expect(hasTerm("Nina", "nina")).toBe(true);
    expect(r.scores.infantil ?? 0).toBeLessThan(r.score);
  });

  it("'nina' (nome próprio) já não é infantil", () => {
    expect(classifyNiche({ headline: "Nina Simone live" }).scores.infantil).toBeUndefined();
  });

  it("'te envío el link' não é produtos; frases de frete são", () => {
    const r = classifyNiche({
      headline: "Comenta 'Yo Quiero' y te envío el link",
      copy: "Comenta 'Yo Quiero' y te envío el link",
    });
    expect(r.niche).not.toBe("produtos");
    expect(r.scores.produtos).toBeUndefined();
    for (const h of [
      "Envio grátis para todo o Brasil",
      "Envío gratis a todo el país",
      "Frete grátis hoje",
      "Livraison gratuite dès 30€",
      "Free shipping on all orders",
      "Pague na entrega",
      "Pago contra reembolso",
    ]) {
      expect(classifyNiche({ headline: h }).niche, h).toBe("produtos");
    }
  });

  it("título só com domínio ('instagram.com') é ignorado", () => {
    expect(classifyNiche({ headline: "instagram.com" }).niche).toBe("outros");
    expect(
      classifyNiche({ advertiser: "Dsjk876", headline: "Dsjk876", copy: "itunes.apple.com" }).niche,
    ).toBe("outros");
    expect(cleanTextField("https://www.instagram.com/p/abc")).toBe("");
  });

  it("modelos {{product.name}} / {{product.brand}} são ignorados", () => {
    for (const advertiser of [
      "Calo",
      "Roomvu",
      "Biorest System",
      "Academia TreeSix",
      "Rainbow Oils",
    ]) {
      const r = classifyNiche({
        advertiser,
        headline: "{{product.name}}",
        copy: "{{product.brand}}",
      });
      expect(r.niche).toBe("outros");
      expect(r.score).toBe(0);
    }
  });

  it("instagram/tiktok sozinhos não são marketing; com contexto são", () => {
    expect(classifyNiche({ headline: "Siga-nos no Instagram e no TikTok" }).niche).toBe("outros");
    expect(classifyNiche({ headline: "Ganhe seguidores no Instagram" }).niche).toBe("marketing");
    expect(classifyNiche({ headline: "TikTok: tráfego pago que converte" }).niche).toBe(
      "marketing",
    );
  });

  it("entidades HTML são decodificadas", () => {
    expect(tokenize("Pel&#250;cia El&#233;trica&nbsp;Interativa")).toEqual([
      "pelucia",
      "eletrica",
      "interativa",
    ]);
  });
});

describe("refinamento: vocabulário novo (amostras reais)", () => {
  const cases: [string, Parameters<typeof classifyNiche>[0]][] = [
    // beleza
    [
      "beleza",
      {
        advertiser: "Ingrid Lückmann Cirurgia Plástica",
        headline: "Ingrid Lückmann Cirurgia Plástica",
        copy: "Dona Lúcia: o caso mais acompanhado por aqui… E dessa vez, resolvi compartilhar como foi o planejamento cirúrgico dessa paciente.",
      },
    ],
    [
      "beleza",
      {
        advertiser: "Dr. Leandro Menezes",
        headline: "Dr. Leandro Menezes",
        copy: "Você conhece alguém que fez a cirurgia de rejuvenescimento das pálpebras, a blefaroplastia e ficou “quase bom”?",
      },
    ],
    [
      "beleza",
      {
        advertiser: "O Boticário",
        headline: "Torna-te Revendedor O Boticário",
        copy: "Inscreve-te, sem qualquer compromisso, como revendedor O Boticário!",
      },
    ],
    ["beleza", { headline: "Semijoias banhadas a ouro com 1 ano de garantia" }],
    ["beleza", { headline: "Harmonização facial e botox com resultado natural" }],
    // produtos (óculos com lentes de grau)
    [
      "produtos",
      {
        advertiser: "Glassesbyahana",
        headline: "Glassesbyahana",
        copy: "Premium eyewear crafted with Bio-Acetate, Titanium & Carbon Fiber. FREE prescription lenses. Factory-direct pricing.",
      },
    ],
    // saúde
    [
      "saude",
      {
        advertiser: "Eparema",
        headline: "Contra má digestão, Eparema",
        copy: "A má digestão apareceu? Eparema tem fórmula natural e única que ajuda a acabar com a má digestão.",
      },
    ],
    ["saude", { headline: "Adiós a la hinchazón y el estreñimiento" }],
    ["saude", { headline: "Fini les ballonnements après les repas" }],
    // educação (material para profissionais que trabalham com idosos)
    [
      "educacao",
      {
        advertiser: "Geriactiva",
        headline: "👍 +3000 Profesionales lo recomiendan",
        copy: "🧓❤️ ¿Trabajas con adultos mayores y se te agotan las ideas para cada sesión?\n\nGeriActive es la biblioteca con +1.000 actividades y ejercicios listos para aplicar",
      },
    ],
    [
      "educacao",
      {
        advertiser: "Geriactiva",
        headline: "La biblioteca +1000 para la tercera edad",
        copy: "La biblioteca mas completa para la tercera edad.\n+1000 actividades ilustradas: fisicas, cognitivas, estiramientos y dinamicas, organizadas por nivel, objetivo y",
      },
    ],
    ["saude", { headline: "Exercícios para idosos: equilíbrio na terceira idade" }],
    // marketing
    [
      "marketing",
      {
        advertiser: "youtubeindia",
        headline: "Upload on YouTube Shorts!",
        copy: "Don't just rely on brand deals! Unlock Gifts, Super Chat, Super Thanks & Channel Memberships at 500 subs on YouTube Shorts!",
      },
    ],
    [
      "marketing",
      {
        advertiser: "StoryBit: Reels & Story Maker",
        headline: "Viral Reels Templates ⚡",
        copy: "Create viral Reels in just one click! 🎬 Choose from 1,000+ trending templates and turn your photos into professional videos instantly.",
      },
    ],
    [
      "marketing",
      {
        advertiser: "Canva",
        headline: "Get premium templates for half the price.",
        copy: "Iba talaga ang saya ‘pag naka-sale. Lalo na kung Canva Pro ang 50% OFF.",
      },
    ],
    [
      "marketing",
      {
        advertiser: "sankhokun",
        headline: "sankhokun",
        copy: "My biggest bottleneck in creating more content is now solved, thanks @elevenlabsio. \n\nComment ELEVEN for a link to a free trial today",
      },
    ],
    [
      "marketing",
      {
        advertiser: "Matheus Mota",
        headline: "Matheus Mota",
        copy: "🚀 Quer criar uma marca que vende todos os dias?\n\nExiste um caminho pra construir uma marca de verdade. Existe um método por trás disso!",
      },
    ],
    [
      "marketing",
      {
        advertiser: "lutsferreira",
        headline: "lutsferreira",
        copy: "Você também é criador de conteúdo? Aqui vai um conselho de quem está há quase 20 anos criando para a internet",
      },
    ],
    ["marketing", { headline: "Automatize suas DMs no Instagram com ManyChat" }],
    ["marketing", { headline: "AI headshot generator: professional photos in minutes" }],
    // diy
    [
      "diy",
      {
        advertiser: "Marcos Vinicius",
        headline: "+90.000 Modelos 3D listos para imprimir",
        copy: "¿Tienes una impresora 3D y no sabes qué imprimir? 🖨️\n✨ Con Colección Maestra 3D accedes a más de 90.000 modelos organizados por categoría",
      },
    ],
    [
      "diy",
      {
        advertiser: "Adesivos da Paulinha",
        headline: "OFERTA ESPECIAL",
        copy: "Se você ama postar STORY fazendo faxina, vai se apaixonar por esse pack! 💅🌸\nAdesivos delicados, femininos e perfeitos para deixar seus Stories muito mais criativos",
      },
    ],
    [
      "diy",
      {
        advertiser: "SAS - Santo Angelo System",
        headline: "SAS - Santo Angelo System",
        copy: "O vídeo do @housemix acendeu um alerta importante: não podemos confiar em marcações que encontramos em réguas de energia por ai",
      },
    ],
    ["diy", { headline: "Apostila de crochê e costura para iniciantes" }],
    ["diy", { headline: "Curso de elétrica residencial: instalações elétricas na prática" }],
    // culinária
    [
      "culinaria",
      {
        advertiser: "Patricio Carvalho",
        headline: "Patricio Carvalho",
        copy: "#publi Essa bomba de cebola faz tanto sucesso que até rouba a cena da picanha no churrasco! 💣🔥\n\nIngredientes: 👇\n• 6 cebolas grandes\n• 100g Bacon picado",
      },
    ],
    [
      "culinaria",
      {
        advertiser: "mundo_da_dona_elvira",
        headline: "mundo_da_dona_elvira",
        copy: "Maravilhosas receitas natalinas da Vó. clique no link da Bio e saiba mais. #receitas #receitasdenatal #natal #chef #rendaextra",
      },
    ],
    ["culinaria", { headline: "Recetas Saludables" }],
    ["culinaria", { headline: "Receitas saudáveis para diabéticos" }],
    ["culinaria", { headline: "Curso de confeitaria: bolos e doces para vender" }],
    ["culinaria", { headline: "Repostería fácil: tortas y postres" }],
    ["culinaria", { headline: "Meal prep recipes for busy weeks" }],
    ["culinaria", { headline: "Recettes de pâtisserie maison" }],
    ["saude", { headline: "Receitas para emagrecer: perca peso com a dieta low carb" }],
    ["saude", { headline: "Recetas para bajar de peso y quemar grasa" }],
  ];
  for (const [niche, input] of cases) {
    it(`${niche}: ${input.advertiser ?? ""} ${input.headline}`, () => {
      expect(classifyNiche(input).niche).toBe(niche);
    });
  }

  it("continua em outros: notícias, desporto e posts genéricos de marca", () => {
    const outros: Parameters<typeof classifyNiche>[0][] = [
      {
        advertiser: "ofm.co.za",
        headline: "Northern Cape police investigate fatal bus accident | OFM",
        copy: "31 de jul. de 2025&nbsp;&#0183;&#32;Northern Cape police investigate fatal bus accident. Photo: Facebook/Wandile Trevor Makhubela",
      },
      {
        advertiser: "champagnerodd",
        headline: "champagnerodd",
        copy: "nothing beats a last minute baseball game thanks to @seatgeek #TeamSeatGeek #chicagocubs #baseballseason",
      },
      {
        advertiser: "Stoque",
        headline: "Stoque",
        copy: "Transformações exigem coragem e para irmos mais longe, não damos um passo, saltamos.\n\nHoje, com muita alegria, anunciamos que Stoque e Rectask passam a saltar j",
      },
      {
        advertiser: "Digitek",
        headline: "Digitek",
        copy: "Getaway ho ya Insta takeover…Digitek Sab Ke Liye! \nBecause every trip becomes content the moment you hit record.",
      },
    ];
    for (const input of outros)
      expect(classifyNiche(input).niche, input.advertiser!).toBe("outros");
  });
});

describe("rótulos", () => {
  it("guarda 'Geral' para outros e o rótulo para os restantes", () => {
    expect(storedNicheLabel("outros")).toBe("Geral");
    expect(storedNicheLabel("diy")).toBe(NICHE_LABEL.diy);
    expect(NICHE_LABEL.entretenimento).toBe("Entretenimento & Séries");
  });
  it("culinaria ligado (rótulo, emoji, filtros)", () => {
    expect(NICHE_LABEL.culinaria).toBe("Culinária & Receitas");
    expect(NICHE_EMOJI.culinaria).toBe("🍰");
    expect(storedNicheLabel("culinaria")).toBe("Culinária & Receitas");
    expect(NICHES.map((n) => n.id)).toContain("culinaria");
    // O rótulo guardado volta a classificar como culinária (nicho declarado).
    expect(
      classifyNiche({ declaredNiche: "Culinária & Receitas", headline: "x" }).scores.culinaria,
    ).toBeGreaterThan(0);
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
