import type { ContentBlock, ContentBlockType } from "../../api/types";
import { ContentBlockEditor } from "../content/ContentBlockEditor";

type Props = {
  articleBlocks: ContentBlock[];
  onAddBlock: (type: ContentBlockType) => void;
  onRemoveBlock: (index: number) => void;
  onUpdateBlock: (index: number, block: ContentBlock) => void;
  onUpdateBlockType: (index: number, type: ContentBlockType) => void;
};

export function PlaceArticleFields({
  articleBlocks,
  onAddBlock,
  onRemoveBlock,
  onUpdateBlock,
  onUpdateBlockType,
}: Props) {
  return (
    <ContentBlockEditor
      blocks={articleBlocks}
      legend="Pełny opis miejsca"
      onAddBlock={onAddBlock}
      onRemoveBlock={onRemoveBlock}
      onUpdateBlock={onUpdateBlock}
      onUpdateBlockType={onUpdateBlockType}
    />
  );
}
