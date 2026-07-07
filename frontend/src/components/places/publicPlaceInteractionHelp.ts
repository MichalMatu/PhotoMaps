import type { SettingHintCopy } from "../ui/SettingField";

export const PUBLIC_PLACE_INTERACTION_HELP_KEYS = [
  "memory-token",
  "memory-photo",
  "memory-audio",
  "memory-caption",
  "memory-text",
  "memory-author-name",
  "memory-author-city",
  "report-reason",
  "report-message",
] as const;

export type PublicPlaceInteractionHelpKey = (typeof PUBLIC_PLACE_INTERACTION_HELP_KEYS)[number];

export const PUBLIC_PLACE_INTERACTION_HELP: Record<PublicPlaceInteractionHelpKey, SettingHintCopy> = {
  "memory-token": {
    title: "Prywatny klucz edycji",
    body: "Token pozwala później odblokować edycję albo usunięcie własnej pamiątki.",
    effect: "Zapisz go przed wysłaniem; PhotoMap nie pokazuje go publicznie.",
  },
  "memory-photo": {
    title: "Zdjęcie pamiątki",
    body: "Zdjęcie po zatwierdzeniu może pojawić się przy miejscu jako pamiątka użytkownika.",
    effect: "Wybierz kadr związany z miejscem i bez prywatnych danych w tle.",
  },
  "memory-audio": {
    title: "Opcjonalne audio",
    body: "Krótki dźwięk może uzupełnić pamiątkę w publicznym podglądzie medium.",
    effect: "Dodawaj tylko materiał, który faktycznie pomaga opowiedzieć wspomnienie.",
  },
  "memory-caption": {
    title: "Krótki podpis",
    body: "Podpis jest widoczny przy pamiątce po zatwierdzeniu przez redakcję.",
    effect: "Najlepiej działa konkret: co widać, kiedy albo dlaczego ten kadr jest ważny.",
  },
  "memory-text": {
    title: "Treść wspomnienia",
    body: "Krótka myśl widoczna przy pamiątce w publicznym widoku miejsca.",
    effect: "Pisz zwięźle i osobiście, bez danych kontaktowych ani cudzych prywatnych informacji.",
  },
  "memory-author-name": {
    title: "Podpis autora",
    body: "Imię albo pseudonim widoczny przy pamiątce po zatwierdzeniu.",
    effect: "Możesz zostawić puste, jeśli nie chcesz podpisu.",
  },
  "memory-author-city": {
    title: "Miasto autora",
    body: "Opcjonalny kontekst autora widoczny przy pamiątce.",
    effect: "Użyj tylko ogólnej lokalizacji, bez adresów i danych prywatnych.",
  },
  "report-reason": {
    title: "Rodzaj problemu",
    body: "Powód pomaga redakcji szybciej skierować zgłoszenie do właściwej korekty.",
    effect: "Wybierz najbliższą kategorię problemu; szczegóły możesz dopisać niżej.",
  },
  "report-message": {
    title: "Szczegóły dla redakcji",
    body: "Krótka wiadomość trafia tylko do panelu admina jako kontekst zgłoszenia.",
    effect: "Podaj konkret: co jest błędne, gdzie to widać i jak można to poprawić.",
  },
};
