import type { SettingHintCopy } from "../ui/SettingField";

export const CONTENT_BLOCK_FIELD_HELP_KEYS = ["format", "text", "link-label", "link-url"] as const;

export type ContentBlockFieldHelpKey = (typeof CONTENT_BLOCK_FIELD_HELP_KEYS)[number];

export const CONTENT_BLOCK_FIELD_HELP: Record<ContentBlockFieldHelpKey, SettingHintCopy> = {
  format: {
    title: "Typ bloku",
    body: "Format określa, czy blok będzie zwykłym akapitem, mocniejszym cytatem albo linkiem.",
    effect: "Dobry format ułatwia skanowanie opisu miejsca, zdjęcia albo trasy.",
  },
  text: {
    title: "Treść bloku",
    body: "Tekst widoczny publicznie w opisie miejsca, zdjęcia albo trasy, zależnie od formularza.",
    effect: "Pisz konkretnie i naturalnie; ten tekst może być też materiałem do TTS.",
  },
  "link-label": {
    title: "Etykieta linku",
    body: "Krótki tekst klikany zamiast surowego adresu URL.",
    effect: "Najlepiej opisuje, dokąd prowadzi link, na przykład strona muzeum albo źródło programu.",
  },
  "link-url": {
    title: "Adres linku",
    body: "Pełny URL zaczynający się od protokołu, na przykład https://.",
    effect: "Link pojawi się jako część publicznego opisu.",
  },
};
