export type SpeechChunk = {
  id: number;
  text: string;
};

const SENTENCE_PATTERN = /[^.!?]+[.!?]+|[^.!?]+$/g;

export function isSpeechSynthesisSupported() {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance !== "undefined" &&
    typeof window.speechSynthesis.cancel === "function" &&
    typeof window.speechSynthesis.getVoices === "function" &&
    typeof window.speechSynthesis.resume === "function" &&
    typeof window.speechSynthesis.speak === "function"
  );
}

export function normalizeSpeechText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export function splitSpeechText(text: string, maxLength = 240): SpeechChunk[] {
  const cleanText = normalizeSpeechText(text);
  if (!cleanText) return [];

  const chunks: string[] = [];
  const sentences = cleanText.match(SENTENCE_PATTERN) ?? [cleanText];
  let current = "";

  for (const sentence of sentences.map((value) => value.trim()).filter(Boolean)) {
    const nextChunk = `${current} ${sentence}`.trim();
    if (nextChunk.length <= maxLength) {
      current = nextChunk;
      continue;
    }

    if (current) {
      chunks.push(current);
    }
    current = sentence;
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.map((chunk, index) => ({ id: index, text: chunk }));
}
