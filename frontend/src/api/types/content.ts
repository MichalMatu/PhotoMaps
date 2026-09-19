type ContentTextBlockType = "heading" | "subheading" | "paragraph";
export type ContentBlockType = ContentTextBlockType | "link";

type ContentTextBlock = {
  type: ContentTextBlockType;
  text: string;
  url?: null;
};

type ContentLinkBlock = {
  type: "link";
  text: string;
  url: string;
};

export type ContentBlock = ContentTextBlock | ContentLinkBlock;
