import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PlaceArticle } from "./PlaceArticle";

describe("PlaceArticle", () => {
  it("renders link blocks as compact external links instead of headings", () => {
    const markup = renderToStaticMarkup(
      <PlaceArticle
        blocks={[
          { type: "heading", text: "Mały pasaż" },
          { type: "link", text: "Roger Molls - The Listener", url: "https://www.youtube.com/watch?v=aUPa4IyWNSo" },
        ]}
      />,
    );

    expect(markup).toContain("<h2>Mały pasaż</h2>");
    expect(markup).toContain('class="place-article-link"');
    expect(markup).toContain('href="https://www.youtube.com/watch?v=aUPa4IyWNSo"');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain("Roger Molls - The Listener");
    expect(markup).not.toContain("<h2>Roger Molls - The Listener</h2>");
  });
});
