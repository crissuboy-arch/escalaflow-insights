// Pure, manual-first clip splitter for the Viral Remix Studio (Fase 4).
// Splits a script into ~8s clips by word count alone — no AI call, no
// network. Google Flow prompts are intentionally left blank for the user to
// write themselves (Fases 1-5 never auto-generate a prompt); Fase 6 may add
// an AI-assisted suggestion later without changing this function's contract.
export interface ScriptClipDraft {
  clipIndex: number;
  durationSeconds: number;
  clipText: string;
  promptText: string;
  aspectRatio: "9:16";
}

const CLIP_DURATION_SECONDS = 8;
// Average spoken pace for short-form narration (words/second). Used only to
// size clips roughly evenly — never shown to the user as a "real" estimate.
const WORDS_PER_SECOND = 2.5;
const WORDS_PER_CLIP = Math.round(CLIP_DURATION_SECONDS * WORDS_PER_SECOND);

/** Splits `scriptText` into clips of roughly WORDS_PER_CLIP words each,
 *  breaking on sentence boundaries when possible so a clip never cuts a
 *  sentence in half mid-word. Empty/whitespace-only input returns no clips. */
export function splitScriptIntoClips(scriptText: string): ScriptClipDraft[] {
  const sentences = scriptText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length === 0) return [];

  const clips: ScriptClipDraft[] = [];
  let current: string[] = [];
  let currentWordCount = 0;

  const flush = () => {
    if (current.length === 0) return;
    clips.push({
      clipIndex: clips.length,
      durationSeconds: CLIP_DURATION_SECONDS,
      clipText: current.join(" "),
      promptText: "",
      aspectRatio: "9:16",
    });
    current = [];
    currentWordCount = 0;
  };

  for (const sentence of sentences) {
    const sentenceWordCount = sentence.split(/\s+/).filter(Boolean).length;
    // A sentence longer than a whole clip is a clip on its own — never
    // split a sentence itself, only decide where one clip ends.
    if (currentWordCount > 0 && currentWordCount + sentenceWordCount > WORDS_PER_CLIP) {
      flush();
    }
    current.push(sentence);
    currentWordCount += sentenceWordCount;
  }
  flush();

  return clips;
}
