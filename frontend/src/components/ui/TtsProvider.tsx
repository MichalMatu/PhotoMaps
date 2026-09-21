import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { isSpeechSynthesisSupported, normalizeSpeechText, splitSpeechText } from "../../utils/tts";

type TtsContextValue = {
  activeKey: string | null;
  isSupported: boolean;
  speak: (ttsKey: string, text: string, lang?: string | null) => void;
  stop: () => void;
  stopKey: (ttsKey: string) => void;
};

const TtsContext = createContext<TtsContextValue>({
  activeKey: null,
  isSupported: false,
  speak: () => undefined,
  stop: () => undefined,
  stopKey: () => undefined,
});

function defaultSpeechLang(lang?: string | null) {
  const normalizedLang = lang?.trim();
  if (normalizedLang) return normalizedLang;
  return typeof document === "undefined" ? "pl-PL" : document.documentElement.lang || "pl-PL";
}

function readSpeechVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSynthesisSupported()) {
    return [];
  }

  return window.speechSynthesis.getVoices();
}

function preferredSpeechVoice(voices: SpeechSynthesisVoice[], lang?: string | null): SpeechSynthesisVoice | null {
  const speechLang = defaultSpeechLang(lang).toLowerCase();
  const speechLanguage = speechLang.split("-")[0];
  return (
    voices.find((voice) => voice.lang.toLowerCase() === speechLang) ??
    voices.find((voice) => voice.lang.toLowerCase().split("-")[0] === speechLanguage) ??
    voices.find((voice) => voice.default) ??
    voices[0] ??
    null
  );
}

type Props = {
  children: ReactNode;
};

export function TtsProvider({ children }: Props) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const isSupported = isSpeechSynthesisSupported();
  const activeKeyRef = useRef<string | null>(null);
  const runIdRef = useRef(0);
  const utterancesRef = useRef<SpeechSynthesisUtterance[]>([]);

  const setCurrentActiveKey = useCallback((ttsKey: string | null) => {
    activeKeyRef.current = ttsKey;
    setActiveKey(ttsKey);
  }, []);

  const stop = useCallback(() => {
    runIdRef.current += 1;
    if (isSpeechSynthesisSupported()) {
      window.speechSynthesis.cancel();
    }
    utterancesRef.current = [];
    setCurrentActiveKey(null);
  }, [setCurrentActiveKey]);

  const stopKey = useCallback(
    (ttsKey: string) => {
      if (activeKeyRef.current === ttsKey) {
        stop();
      }
    },
    [stop],
  );

  const speak = useCallback(
    (ttsKey: string, text: string, lang?: string | null) => {
      if (!isSpeechSynthesisSupported()) return;

      const chunks = splitSpeechText(text);
      if (chunks.length === 0) return;
      const availableVoices = readSpeechVoices();
      const voice = preferredSpeechVoice(availableVoices, lang);

      runIdRef.current += 1;
      const runId = runIdRef.current;
      const speechLang = voice?.lang || defaultSpeechLang(lang);
      window.speechSynthesis.cancel();
      utterancesRef.current = [];
      setCurrentActiveKey(ttsKey);

      const finish = () => {
        if (runIdRef.current === runId) {
          utterancesRef.current = [];
          setCurrentActiveKey(null);
        }
      };

      let nextChunkIndex = 0;
      const speakNextChunk = () => {
        if (runIdRef.current !== runId) {
          return;
        }

        const chunk = chunks[nextChunkIndex];
        if (!chunk) {
          finish();
          return;
        }

        nextChunkIndex += 1;
        const utterance = new window.SpeechSynthesisUtterance(chunk.text);
        utterance.lang = speechLang;
        if (voice) {
          utterance.voice = voice;
        }
        utterance.onend = speakNextChunk;
        utterance.onerror = finish;
        utterancesRef.current = [...utterancesRef.current, utterance];

        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
      };

      speakNextChunk();
    },
    [setCurrentActiveKey],
  );

  useEffect(() => stop, [stop]);

  const contextValue = useMemo(
    () => ({
      activeKey,
      isSupported,
      speak,
      stop,
      stopKey,
    }),
    [activeKey, isSupported, speak, stop, stopKey],
  );

  return <TtsContext.Provider value={contextValue}>{children}</TtsContext.Provider>;
}

export function useTts() {
  return useContext(TtsContext);
}

export function canRenderTtsButton(text: string | null | undefined) {
  return Boolean(normalizeSpeechText(text ?? ""));
}
