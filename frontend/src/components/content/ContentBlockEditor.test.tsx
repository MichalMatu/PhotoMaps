import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ContentBlock } from "../../api/types";
import { ContentBlockEditor } from "./ContentBlockEditor";

const noop = () => undefined;

describe("ContentBlockEditor", () => {
  it("renders help for text and link block fields", () => {
    const blocks: ContentBlock[] = [
      { text: "Krótki kontekst miejsca.", type: "paragraph" },
      { text: "Źródło", type: "link", url: "https://example.com" },
    ];

    const markup = renderToStaticMarkup(
      <ContentBlockEditor
        blocks={blocks}
        idPrefix="test-blocks"
        legend="Opis"
        onAddBlock={noop}
        onRemoveBlock={noop}
        onUpdateBlock={noop}
        onUpdateBlockType={noop}
      />,
    );

    expect(markup.match(/role="tooltip"/g)).toHaveLength(5);
    expect(markup).toContain('id="test-blocks-0-format"');
    expect(markup).toContain('id="test-blocks-0-text"');
    expect(markup).toContain('id="test-blocks-1-link-label"');
    expect(markup).toContain('id="test-blocks-1-link-url"');
  });
});
