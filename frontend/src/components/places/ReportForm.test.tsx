import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ReportForm } from "./ReportForm";

describe("ReportForm", () => {
  it("explains report reason and message inline", () => {
    const markup = renderToStaticMarkup(<ReportForm targetId="photo-1" targetType="photo" showHeading={false} />);

    expect(markup).toContain('id="report-reason-hint"');
    expect(markup).toContain('id="report-message-hint"');
    expect(markup).toContain('aria-describedby="report-reason-hint"');
    expect(markup).toContain('aria-describedby="report-message-hint"');
    expect(markup).not.toContain('role="tooltip"');
  });
});
