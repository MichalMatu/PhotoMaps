import { Square, Volume2 } from "lucide-react";
import { useEffect } from "react";

import { canRenderTtsButton, useTts } from "./TtsProvider";

type Props = {
  className?: string;
  iconOnly?: boolean;
  label?: string;
  lang?: string | null;
  text: string | null | undefined;
  ttsKey: string;
};

export function TtsButton({
  className,
  iconOnly = false,
  label = "Odczytaj tekst",
  lang = "pl-PL",
  text,
  ttsKey,
}: Props) {
  const { activeKey, isSupported, speak, stop, stopKey } = useTts();
  const canRender = isSupported && canRenderTtsButton(text);

  useEffect(() => {
    if (!canRender) {
      stopKey(ttsKey);
    }

    return () => stopKey(ttsKey);
  }, [canRender, stopKey, ttsKey]);

  if (!canRender) return null;

  const isActive = activeKey === ttsKey;
  const buttonLabel = isActive ? "Zatrzymaj czytanie" : label;
  const baseClassName = iconOnly ? "tts-button tts-button--icon" : "ui-button ui-button--ghost tts-button";
  const buttonClassName = className ? `${baseClassName} ${className}` : baseClassName;

  return (
    <button
      className={buttonClassName}
      type="button"
      aria-label={buttonLabel}
      title={buttonLabel}
      onClick={() => {
        if (isActive) {
          stop();
          return;
        }
        speak(ttsKey, text ?? "", lang);
      }}
    >
      {isActive ? <Square aria-hidden="true" size={16} /> : <Volume2 aria-hidden="true" size={18} />}
      {iconOnly ? null : <span>{buttonLabel}</span>}
    </button>
  );
}
