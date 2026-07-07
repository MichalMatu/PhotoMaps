import type { ContentBlock, ContentBlockType } from "../../api/types";
import { SettingField } from "../ui/SettingField";
import { CONTENT_BLOCK_FIELD_HELP } from "./contentBlockFieldHelp";
import { CONTENT_BLOCK_TYPES, contentBlockLabel } from "./contentBlocks";

type Props = {
  blocks: ContentBlock[];
  idPrefix?: string;
  legend: string;
  onAddBlock: (type: ContentBlockType) => void;
  onRemoveBlock: (index: number) => void;
  onUpdateBlock: (index: number, block: ContentBlock) => void;
  onUpdateBlockType: (index: number, type: ContentBlockType) => void;
};

export function ContentBlockEditor({
  blocks,
  idPrefix = "content-block",
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
            <SettingField id={`${idPrefix}-${index}-format`} label="Format" hint={CONTENT_BLOCK_FIELD_HELP.format}>
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
            </SettingField>
            {block.type === "link" ? (
              <div className="content-block-link-fields place-article-link-fields">
                <SettingField
                  id={`${idPrefix}-${index}-link-label`}
                  label="Etykieta"
                  hint={CONTENT_BLOCK_FIELD_HELP["link-label"]}
                >
                  <input
                    value={block.text}
                    onChange={(event) => onUpdateBlock(index, { ...block, text: event.target.value })}
                    required
                  />
                </SettingField>
                <SettingField
                  id={`${idPrefix}-${index}-link-url`}
                  label="URL"
                  hint={CONTENT_BLOCK_FIELD_HELP["link-url"]}
                >
                  <input
                    type="url"
                    value={block.url}
                    onChange={(event) => onUpdateBlock(index, { ...block, url: event.target.value })}
                    required
                  />
                </SettingField>
              </div>
            ) : (
              <SettingField id={`${idPrefix}-${index}-text`} label="Treść" hint={CONTENT_BLOCK_FIELD_HELP.text}>
                <textarea
                  className="content-block-text place-article-block-text"
                  rows={block.type === "paragraph" ? 5 : 2}
                  value={block.text}
                  onChange={(event) => onUpdateBlock(index, { ...block, text: event.target.value })}
                />
              </SettingField>
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
