import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PhotoAttributionFields } from "./PhotoAttributionFields";

describe("PhotoAttributionFields", () => {
  it("renders help for all attribution inputs with a caller prefix", () => {
    const markup = renderToStaticMarkup(
      <PhotoAttributionFields
        draft={{
          attributionAuthor: "Anna",
          attributionLicense: "CC BY-SA 4.0",
          attributionLicenseUrl: "https://example.com/license",
          attributionSourceUrl: "https://example.com/source",
        }}
        idPrefix="test-attribution"
        onChange={() => undefined}
      />,
    );

    expect(markup.match(/role="tooltip"/g)).toHaveLength(4);
    expect(markup).toContain('id="test-attribution-author"');
    expect(markup).toContain('id="test-attribution-license"');
    expect(markup).toContain('id="test-attribution-source-url"');
    expect(markup).toContain('id="test-attribution-license-url"');
  });
});
