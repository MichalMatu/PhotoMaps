import { FileText } from "lucide-react";

import type { ContentBlock } from "../../api/types";
import { ContentBlocks } from "../content/ContentBlocks";
import { contentBlocksTextForTts, normalizeContentBlocks } from "../content/contentBlocks";
import { TtsButton } from "../ui/TtsButton";

type PhotoDescriptionActionsProps = {
  actionClassName: string;
  descriptionText: string;
  isExpanded: boolean;
  onToggle: () => void;
  ttsKey: string;
};

type PhotoDescriptionLayerProps = {
  blocks: ContentBlock[];
  className: string;
  contentClassName: string;
};

export function photoDescriptionText(blocks: ContentBlock[]) {
  return contentBlocksTextForTts(blocks);
}

export function PhotoDescriptionActions({
  actionClassName,
  descriptionText,
  isExpanded,
  onToggle,
  ttsKey,
}: PhotoDescriptionActionsProps) {
  if (!descriptionText) {
    return null;
  }

  const descriptionLabel = isExpanded ? "Ukryj opis zdjęcia" : "Pokaż opis zdjęcia";

  return (
    <>
      <button
        className={actionClassName}
        type="button"
        aria-label={descriptionLabel}
        aria-pressed={isExpanded}
        title={descriptionLabel}
        onClick={onToggle}
      >
        <FileText aria-hidden="true" size={18} />
      </button>
      <TtsButton
        className={actionClassName}
        iconOnly
        label="Odczytaj opis zdjęcia"
        text={descriptionText}
        ttsKey={ttsKey}
      />
    </>
  );
}

export function PhotoDescriptionLayer({ blocks, className, contentClassName }: PhotoDescriptionLayerProps) {
  const normalizedBlocks = normalizeContentBlocks(blocks);
  if (normalizedBlocks.length === 0) {
    return null;
  }

  return (
    <section className={className} role="note" aria-label="Opis zdjęcia">
      <ContentBlocks blocks={normalizedBlocks} className={contentClassName} />
    </section>
  );
}
