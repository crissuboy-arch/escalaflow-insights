## StoryBook Engine AI — Fase 1

Motor completo de geração de histórias virais, romances e ficção seriada, reusando a entidade `projects` existente (`mode='story'`). Sem novas tabelas. Sem APIs externas pagas: TikTok e Audiobook entregam **prompts e roteiros copiáveis**.

---

## 1. Arquitetura

- **Reuso total** de `projects`: `mode = 'story'`, todo o estado vive em `projects.meta.story` (jsonb).
- **Nenhuma migração**: `projects.meta.story` guarda planejamento, personagens, estrutura, capítulos, capa, shorts, audiobook.
- Capítulos longos vão em `projects.outline` (estrutura) e `projects.briefing.chapters` (texto), mesmo padrão dos ebooks.
- Exportadores reusam `src/lib/ebook/{pdf,docx,epub,html}.ts` adaptando o mapper de capítulos.

```text
projects.meta.story = {
  planning: { type, subniche, audience, language, chapters, ending,
              intensity, hotLevel, tone, title, subtitle },
  characters: [{ id, role, name, age, look, personality, trauma,
                 desires, fears, style, quotes, refImageUrl, visualPrompts:{pixar,real,anime} }],
  structure: { synopsis, bigIdea, plotTwist, hooks[], cliffhangers[], journey[], outline[] },
  chapters: [{ id, title, body, words, status }],
  cover: { style, prompts:{dalle,midjourney,leonardo,gemini}, author, badges[] },
  shorts: [{ chapterId, pov, hook, script, caption, cta, hashtags[], scenePrompts[] }],
  audiobook: { voice, speed, mood, soundtrack, scriptSSML },
  step: 1..8
}
```

## 2. Rotas (TanStack)

Tudo sob `_authenticated`:

```text
src/routes/_authenticated/
  storybook.tsx                  # Hub (lista + criar)
  storybook.$id.tsx              # Workspace com 8 abas (Outlet)
  storybook.$id.planejamento.tsx
  storybook.$id.personagens.tsx
  storybook.$id.estrutura.tsx
  storybook.$id.capitulos.tsx
  storybook.$id.capa.tsx
  storybook.$id.shorts.tsx
  storybook.$id.audiobook.tsx
  storybook.$id.exportar.tsx
```

Sidebar (`AppSidebar.tsx`) ganha grupo **"StoryBook Engine"** com sub-itens:
- StoryBook Engine (`/storybook`)
- Romance Engine → `/storybook?preset=romance`
- TikTok Story → `/storybook?preset=tiktok`
- Drama AI → `/storybook?preset=drama`
- Personagens → aba global no workspace ativo
- Audiobook IA → idem

Os 4 últimos são filtros/atalhos do mesmo motor.

## 3. Server functions (novo arquivo)

`src/lib/storybook.functions.ts` + `src/lib/storybook.server.ts`:

```text
createStory({ planning })            -> cria project mode=story
updateStoryStep({ id, step, patch }) -> merge em meta.story
aiGenerateCharacters({ id, count })
aiGenerateStructure({ id })
aiGenerateChapter({ id, chapterIndex, action })
   action: generate | regenerate | expand | shorten |
           more-emotion | more-tension | more-romance |
           more-humor | more-dialogue
aiGenerateCoverPrompts({ id })
aiGenerateShorts({ id, chapterId })       -> POV/hook/script/legenda/CTA/hashtags/cenas
aiGenerateAudiobookScript({ id, chapterId }) -> texto narrado + marcas SSML-like
exportStory({ id, format })               -> pdf|docx|epub|html|txt|kindle(epub-kindle)|wattpad(txt formatado)
```

Tudo via Lovable AI Gateway (`google/gemini-3-flash-preview` default; `gpt-5-mini` para capítulos longos). Capítulos são gerados **em streaming** quando possível, salvos por chunk em `meta.story.chapters[i].body`.

## 4. Catálogos (constantes)

`src/lib/storybook/catalog.ts`:

- `STORY_TYPES`: 15 tipos (Romance CEO, Dark, Máfia Italiana, Traficante, CEO/Empregada, Casamento por Contrato, Gravidez Inesperada, Mãe Solo, Cristão, Segunda Chance, Fantasia Romântica, Lobisomem, Vampiro, Bilionário Obsessivo, Inimigos→Amantes).
- `SUBNICHES`: 13 (CEO frio, chefe do morro, favela luxury, mafioso possessivo, bad boy, policial infiltrado, milionário arrogante, amor proibido, vingança, obsessão, traição, ciúmes, revenge romance).
- `HOT_LEVELS`: soft, sensual, picante, explícito.
- `CHAPTER_COUNTS`: 20/30/60/80/100/120/150.
- `COVER_STYLES`: 10 (Dark Romance, CEO Luxury, Favela Luxury, Máfia Italiana, Neon Romance, Cristão, Minimalista, Cinemático, Anime, Hot).
- `BADGES`: bestseller, hot, viral TikTok.
- `VOICES`: feminina-doce, feminina-grave, masculina-grave, masculina-jovem, emocional, narrador-classico.

Cada item carrega `promptHint` para injetar nos prompts de IA.

## 5. UI — identidade visual

Reusa tokens existentes (`src/styles.css`). Componentes novos:

- `src/components/storybook/StoryHub.tsx` — grid de cards premium (criar do zero / by preset / continuar).
- `src/components/storybook/StepNav.tsx` — barra horizontal com 8 etapas, glow neon na etapa ativa, scroll horizontal no mobile.
- `src/components/storybook/CharacterCard.tsx` — glassmorphism, avatar, traços, frases.
- `src/components/storybook/ChapterEditor.tsx` — textarea + toolbar (regerar/expandir/encurtar/+emoção/+tensão/+romance/+humor/+diálogo) + contador (palavras / páginas estimadas / minutos de leitura).
- `src/components/storybook/CoverPromptPanel.tsx` — abas DALL·E / Midjourney / Leonardo / Gemini com botão copiar.
- `src/components/storybook/ShortsPanel.tsx` — cards de shorts por capítulo.
- `src/components/storybook/AudiobookPanel.tsx` — seletor de voz/velocidade/trilha + script SSML copiável + nota "TTS externo".
- `src/components/storybook/ExportPanel.tsx` — botões PDF/DOCX/EPUB/Kindle/Wattpad/TXT.

Mobile-first: `StepNav` vira scroll-x com snap; toolbars colapsam em sheets; cards 1-coluna < 768px.

## 6. Exportadores

- PDF/DOCX/EPUB/HTML: adaptam input para `{ title, subtitle, author, chapters: [{title, body}] }` e chamam exporters existentes.
- **Kindle**: variante do EPUB com manifesto compatível (`epub.ts` já é EPUB3; só renomear `.epub` e adicionar guia "Send to Kindle").
- **Wattpad**: texto puro, capítulos separados por `***`, copyright no topo — gerado em memória.
- **TXT**: dump de capítulos.

Sem `.zip` nessa fase (não pedido).

## 7. Fluxo de criação

1. `/storybook` → card "Nova história" abre dialog com `planning` mínimo (título, tipo, capítulos, idioma).
2. `createStory` cria project, redireciona para `/storybook/:id/planejamento`.
3. Cada etapa salva via `updateStoryStep` ao avançar; botão "Gerar com IA" disponível por etapa.
4. Capítulos: gera N em background, mostra progresso por capítulo; usuário pode editar cada um.
5. Capa/Shorts/Audiobook: geram prompts/roteiros copiáveis (sem TTS/imagem real).
6. Exportar: dropdown de formato → download direto.

## 8. Entregáveis

1. `src/lib/storybook/catalog.ts`
2. `src/lib/storybook.functions.ts` + `src/lib/storybook.server.ts`
3. `src/lib/storybook/exporters.ts` (mapper p/ exporters existentes + Wattpad/TXT/Kindle)
4. 9 arquivos de rota em `src/routes/_authenticated/storybook*`
5. 8 componentes em `src/components/storybook/`
6. Update em `src/components/AppSidebar.tsx` (novo grupo)
7. Tipo `mode='story'` aceito em validators de `project.functions.ts`

## 9. Fora desta fase

- Playbook Engine, Copy Engine, Ads Creative Engine (40 formatos), App Builder, Andrômeda Dash AI — ficam para fases 2+.
- TTS real, geração de imagem de capa real, geração de vídeo TikTok — só prompts.
- Upload de referência visual: aceita upload no bucket `ebook-covers/refs/` e exibe, mas não roda visão computacional.

## 10. Validação

- Criar história "Romance Dark / CEO frio / 30 capítulos" → wizard salva em `meta.story`.
- Gerar 3 personagens → cards aparecem com traços e prompts visuais Pixar/Real/Anime.
- Gerar estrutura → sinopse + 30 itens de outline.
- Gerar capítulo 1 → texto > 800 palavras, contador atualiza.
- "Mais tensão" no capítulo 1 → texto regenera mantendo plot.
- Gerar prompts de capa → 4 prompts distintos copiáveis.
- Gerar shorts do cap. 1 → POV + hook + 60s script + hashtags.
- Exportar EPUB → arquivo abre no Calibre com todos os capítulos.
- Mobile 375px: navegação entre etapas funciona, editor utilizável, cards empilham.
