import type { ContentBlock, ContentBlockType } from "../../api/types";
import { CONTENT_BLOCK_TYPES, contentBlockLabel } from "./contentBlocks";

type Props = {
  blocks: ContentBlock[];
  legend: string;
  onAddBlock: (type: ContentBlockType) => void;
  onRemoveBlock: (index: number) => void;
  onUpdateBlock: (index: number, block: ContentBlock) => void;
  onUpdateBlockType: (index: number, type: ContentBlockType) => void;
};

export function ContentBlockEditor({
  blocks,
  legend,
  onAddBlock,
  onRemoveBlock,
  onUpdateBlock,
  onUpdateBlockType,
}: Props) {
  return (
    <fieldset className="content-block-editor place-article-fields">
      <legend>{legend}</legend>
      <div className="content-block-editor-list place-article-block-list">
        {blocks.map((block, index) => (
          <div className="content-block-editor-row place-article-block-editor" key={index}>
            <label>
              Format
              <select
                value={block.type}
                onChange={(event) => onUpdateBlockType(index, event.target.value as ContentBlockType)}
              >
                {CONTENT_BLOCK_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {contentBlockLabel(type)}
                  </option>
                ))}
              </select>
            </label>
            {block.type === "link" ? (
              <div className="content-block-link-fields place-article-link-fields">
                <label>
                  Etykieta
                  <input
                    value={block.text}
                    onChange={(event) => onUpdateBlock(index, { ...block, text: event.target.value })}
                    required
                  />
                </label>
                <label>
                  URL
                  <input
                    type="url"
                    value={block.url}
                    onChange={(event) => onUpdateBlock(index, { ...block, url: event.target.value })}
                    required
                  />
                </label>
              </div>
            ) : (
              <label className="content-block-text place-article-block-text">
                Treść
                <textarea
                  rows={block.type === "paragraph" ? 5 : 2}
                  value={block.text}
                  onChange={(event) => onUpdateBlock(index, { ...block, text: event.target.value })}
                />
              </label>
            )}
            <button
              className="ui-button ui-button--ghost place-article-remove-button"
              type="button"
              onClick={() => onRemoveBlock(index)}
            >
              Usuń
            </button>
          </div>
        ))}
      </div>
      <div className="content-block-add-actions place-article-add-actions">
        {CONTENT_BLOCK_TYPES.map((type) => (
          <button className="ui-button ui-button--secondary" key={type} type="button" onClick={() => onAddBlock(type)}>
            {contentBlockLabel(type)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
