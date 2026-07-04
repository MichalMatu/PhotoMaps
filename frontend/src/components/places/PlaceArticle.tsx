import type { ContentBlock } from "../../api/types";
import { ContentBlocks } from "../content/ContentBlocks";

type Props = {
  blocks: ContentBlock[];
};

export function PlaceArticle({ blocks }: Props) {
  return <ContentBlocks blocks={blocks} />;
}
