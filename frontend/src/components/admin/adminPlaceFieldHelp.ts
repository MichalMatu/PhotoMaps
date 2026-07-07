import type { SettingHintCopy } from "../ui/SettingField";

export const ADMIN_PLACE_FIELD_HELP_KEYS = [
  "title",
  "city",
  "location",
  "description",
  "local-comment",
  "editorial-priority",
  "status",
] as const;

export type AdminPlaceFieldHelpKey = (typeof ADMIN_PLACE_FIELD_HELP_KEYS)[number];

export const ADMIN_PLACE_FIELD_HELP: Record<AdminPlaceFieldHelpKey, SettingHintCopy> = {
  title: {
    title: "Nazwa miejsca",
    body: "Publiczna nazwa widoczna na mapie, w karcie miejsca, trasach i wynikach wyszukiwania w adminie.",
    effect: "Krótka, rozpoznawalna nazwa poprawia skanowanie mapy i list redakcyjnych.",
  },
  city: {
    title: "Kontekst miasta",
    body: "Miasto decyduje o grupowaniu miejsca w adminie i o tym, w jakim kontekście mapa je pokazuje.",
    effect: "Nie opieramy widoku miasta na kolejności rekordów, tylko na jawnym przypisaniu.",
  },
  location: {
    title: "Pozycja na mapie",
    body: "Współrzędne punktu, przy którym publiczna mapa układa miniaturę miejsca.",
    effect: "Dokładna lokalizacja zmniejsza kolizje kafli i poprawia sens tras oraz kolekcji.",
  },
  description: {
    title: "Krótki opis publiczny",
    body: "Zwięzły tekst o miejscu używany w publicznym podglądzie i jako kontekst dla zdjęć.",
    effect: "Najlepiej działa jedno lub dwa zdania, które tłumaczą klimat miejsca bez powtarzania nazwy.",
  },
  "local-comment": {
    title: "Notatka redakcyjna",
    body: "Wewnętrzny komentarz dla redakcji, niewidoczny publicznie.",
    effect: "Używaj go do decyzji, braków, źródeł roboczych albo wskazówek dla kolejnej korekty.",
  },
  "editorial-priority": {
    title: "Ręczne wyróżnienie",
    body: "Priorytet miejsca używany przez ranking kafli mapy obok zdjęć, pamiątek i score.",
    effect: "Wyższa wartość zwiększa szansę widoczności miejsca i może powiększyć jego kafel.",
    range: "Od 0 do 10.",
  },
  status: {
    title: "Widoczność miejsca",
    body: "Szkic nie jest publiczny, opublikowane miejsce trafia do mapy, a archiwalne znika z bieżącej pracy.",
    effect: "Zmieniaj status dopiero wtedy, gdy miejsce ma poprawną lokalizację, kategorie i media.",
  },
};
