import { describe, it, expect } from "vitest";
import { splitScriptIntoClips } from "./clip-splitter";

describe("splitScriptIntoClips", () => {
  it("devolve lista vazia para texto vazio", () => {
    expect(splitScriptIntoClips("")).toEqual([]);
    expect(splitScriptIntoClips("   ")).toEqual([]);
  });

  it("um texto curto cabe num único clipe", () => {
    const clips = splitScriptIntoClips("Isto é um teste curto.");
    expect(clips).toHaveLength(1);
    expect(clips[0].clipIndex).toBe(0);
    expect(clips[0].durationSeconds).toBe(8);
    expect(clips[0].aspectRatio).toBe("9:16");
    expect(clips[0].promptText).toBe("");
  });

  it("nunca corta uma frase a meio", () => {
    const script =
      "Primeira frase bem longa que já quase enche um clipe inteiro de oito segundos sozinha. " +
      "Segunda frase curta.";
    const clips = splitScriptIntoClips(script);
    const allText = clips.map((c) => c.clipText).join(" ");
    expect(allText).toContain(
      "Primeira frase bem longa que já quase enche um clipe inteiro de oito segundos sozinha.",
    );
    expect(allText).toContain("Segunda frase curta.");
    // cada frase aparece inteira dentro de UM clipe, nunca partida entre dois
    for (const sentence of script.split(/(?<=[.!?])\s+/)) {
      const foundInOneClip = clips.some((c) => c.clipText.includes(sentence.trim()));
      expect(foundInOneClip).toBe(true);
    }
  });

  it("divide um roteiro longo em vários clipes com índices sequenciais", () => {
    const sentence = "Esta é uma frase de tamanho médio para testar a divisão.";
    const script = Array.from({ length: 10 }, () => sentence).join(" ");
    const clips = splitScriptIntoClips(script);
    expect(clips.length).toBeGreaterThan(1);
    clips.forEach((c, i) => expect(c.clipIndex).toBe(i));
  });

  it("uma frase sozinha maior que um clipe ainda forma um clipe próprio, sem ser cortada", () => {
    const longSentence =
      "Esta frase é deliberadamente muito mais longa do que o normal para um clipe de oito segundos porque precisamos de confirmar que o divisor nunca parte uma frase ao meio mesmo quando ela sozinha já excede a contagem alvo de palavras por clipe.";
    const clips = splitScriptIntoClips(longSentence);
    expect(clips).toHaveLength(1);
    expect(clips[0].clipText).toBe(longSentence);
  });

  it("é determinístico", () => {
    const script = "Frase um. Frase dois. Frase três. Frase quatro.";
    expect(splitScriptIntoClips(script)).toEqual(splitScriptIntoClips(script));
  });
});
