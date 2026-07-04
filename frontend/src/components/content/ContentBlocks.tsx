import { ExternalLink } from "lucide-react";

import type { ContentBlock } from "../../api/types";
import { safeContentBlockUrl } from "./contentBlocks";

type Props = {
  blocks: ContentBlock[];
  className?: string;
};

export function ContentBlocks({ blocks, className = "place-article" }: Props) {
  if (blocks.length === 0) return null;

  return (
    <article className={className}>
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        if (block.type === "heading") {
          return <h2 key={key}>{block.text}</h2>;
        }
        if (block.type === "subheading") {
          return <h3 key={key}>{block.text}</h3>;
        }
        if (block.type === "link") {
          const href = safeContentBlockUrl(block.url);
          if (!href) return null;
          return (
            <p className="place-article-link-row" key={key}>
              <a className="place-article-link" href={href} rel="noreferrer" target="_blank">
                <span>{block.text}</span>
                <ExternalLink aria-hidden="true" size={16} />
              </a>
            </p>
          );
        }
        return <p key={key}>{block.text}</p>;
      })}
    </article>
  );
}
