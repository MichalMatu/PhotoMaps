import type { SettingHintCopy } from "../ui/SettingField";

export const ADMIN_MEDIA_FIELD_HELP_KEYS = [
  "city",
  "place",
  "photo-file",
  "audio-file",
  "caption",
  "description-blocks",
  "attribution-author",
  "attribution-license",
  "attribution-source-url",
  "attribution-license-url",
] as const;

export type AdminMediaFieldHelpKey = (typeof ADMIN_MEDIA_FIELD_HELP_KEYS)[number];

export const ADMIN_MEDIA_FIELD_HELP: Record<AdminMediaFieldHelpKey, SettingHintCopy> = {
  city: {
    title: "Miasto dla zdjęcia",
    body: "Miasto zawęża listę miejsc, do których możesz przypiąć zdjęcie redakcyjne.",
    effect: "Zdjęcie zawsze pracuje dla konkretnego miejsca, nie jako osobny byt poza mapą.",
  },
  place: {
    title: "Miejsce zdjęcia",
    body: "Miejsce decyduje, gdzie zdjęcie pojawi się w galerii, coverze i publicznym wachlarzu na mapie.",
    effect: "Po zatwierdzeniu zdjęcie wzmacnia wizualny ranking tego miejsca.",
  },
  "photo-file": {
    title: "Plik zdjęcia",
    body: "Oryginał trafia do prywatnego storage, a publiczne kopie i miniatury powstają w pipeline mediów.",
    effect: "Wybieraj realne zdjęcia miejsca, nie ilustracje ani przypadkowe kadry bez wartości redakcyjnej.",
  },
  "audio-file": {
    title: "Audio do medium",
    body: "Krótka ścieżka dźwiękowa przypięta do zdjęcia albo pamiątki i odtwarzana przy podglądzie medium.",
    effect: "Dodawaj tylko materiał, który pomaga zrozumieć miejsce lub kontekst zdjęcia.",
  },
  caption: {
    title: "Podpis publiczny",
    body: "Krótki podpis widoczny przy zdjęciu w publicznej galerii i w adminie.",
    effect: "Najlepiej opisuje konkretny kadr, detal albo sytuację, zamiast powtarzać nazwę miejsca.",
  },
  "description-blocks": {
    title: "Opis medium",
    body: "Rozbudowany opis zdjęcia używany w publicznym widoku medium i w materiałach redakcyjnych.",
    effect: "To dobre miejsce na kontekst, historię kadru, detale i tekst do odczytu TTS.",
  },
  "attribution-author": {
    title: "Autor pliku",
    body: "Nazwa autora albo instytucji źródłowej dla konkretnego zdjęcia.",
    effect: "Uzupełnij zawsze, gdy źródło podaje autora lub wymaga atrybucji.",
  },
  "attribution-license": {
    title: "Nazwa licencji",
    body: "Krótka nazwa prawa użycia, na przykład CC BY-SA 4.0, CC0 albo Public Domain Mark.",
    effect: "Nie używaj materiałów bez pewnego prawa ponownego użycia.",
  },
  "attribution-source-url": {
    title: "Link źródłowy",
    body: "Stabilny adres strony konkretnego pliku, nie tylko strona główna serwisu lub wynik wyszukiwania.",
    effect: "Pozwala wrócić do źródła i zweryfikować autora oraz licencję.",
  },
  "attribution-license-url": {
    title: "Link licencji",
    body: "Adres warunków licencji albo opisu domeny publicznej dla użytego pliku.",
    effect: "Ułatwia audyt praw do mediów i późniejsze korekty redakcyjne.",
  },
};
