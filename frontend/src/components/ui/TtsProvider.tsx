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
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(readSpeechVoices);
  const isSupported = isSpeechSynthesisSupported() && voices.length > 0;
  const activeKeyRef = useRef<string | null>(null);
  const runIdRef = useRef(0);
  const utterancesRef = useRef<SpeechSynthesisUtterance[]>([]);
  const startTimeoutRef = useRef<number | null>(null);

  const clearPendingStart = useCallback(() => {
    if (startTimeoutRef.current === null || typeof window === "undefined") {
      return;
    }

    window.clearTimeout(startTimeoutRef.current);
    startTimeoutRef.current = null;
  }, []);

  const setCurrentActiveKey = useCallback((ttsKey: string | null) => {
    activeKeyRef.current = ttsKey;
    setActiveKey(ttsKey);
  }, []);

  const stop = useCallback(() => {
    runIdRef.current += 1;
    clearPendingStart();
    if (isSpeechSynthesisSupported()) {
      window.speechSynthesis.cancel();
    }
    utterancesRef.current = [];
    setCurrentActiveKey(null);
  }, [clearPendingStart, setCurrentActiveKey]);

  const stopKey = useCallback(
    (ttsKey: string) => {
      if (activeKeyRef.current === ttsKey) {
        stop();
      }
    },
    [stop],
  );

  useEffect(() => {
    if (!isSpeechSynthesisSupported()) {
      return undefined;
    }

    const syncVoices = () => setVoices(readSpeechVoices());
    const timeoutId = window.setTimeout(syncVoices, 250);
    syncVoices();
    window.speechSynthesis.addEventListener("voiceschanged", syncVoices);

    return () => {
      window.clearTimeout(timeoutId);
      window.speechSynthesis.removeEventListener("voiceschanged", syncVoices);
    };
  }, []);

  const speak = useCallback(
    (ttsKey: string, text: string, lang?: string | null) => {
      if (!isSpeechSynthesisSupported()) return;

      const chunks = splitSpeechText(text);
      if (chunks.length === 0) return;
      const availableVoices = readSpeechVoices();
      const voice = preferredSpeechVoice(availableVoices, lang);
      if (!voice) return;

      runIdRef.current += 1;
      const runId = runIdRef.current;
      const speechLang = voice.lang || defaultSpeechLang(lang);
      clearPendingStart();
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
        utterance.voice = voice;
        utterance.onend = speakNextChunk;
        utterance.onerror = finish;
        utterancesRef.current = [...utterancesRef.current, utterance];

        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
      };

      startTimeoutRef.current = window.setTimeout(() => {
        startTimeoutRef.current = null;
        speakNextChunk();
      }, 0);
    },
    [clearPendingStart, setCurrentActiveKey],
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
