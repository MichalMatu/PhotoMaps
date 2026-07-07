import type { SettingHintCopy } from "../ui/SettingField";

export const ADMIN_MAP_SETTING_IDS = [
  "fallback-center-lat",
  "fallback-center-lon",
  "fallback-zoom",
  "marker-base-width",
  "marker-base-height",
  "marker-min-render-scale",
  "marker-max-render-scale",
  "marker-priority-min-scale",
  "marker-priority-max-scale",
  "marker-priority-curve",
  "marker-density-area",
  "marker-density-min-zoom",
  "marker-density-full-zoom",
  "marker-density-min-fill",
  "marker-density-max-fill",
  "marker-density-curve",
  "marker-priority-editorial",
  "marker-priority-photos",
  "marker-priority-memories",
  "marker-priority-score",
] as const;

export type AdminMapSettingId = (typeof ADMIN_MAP_SETTING_IDS)[number];

export const ADMIN_MAP_SETTING_HELP = {
  "fallback-center-lat": {
    title: "Szerokość startowa",
    body: "Domyślna szerokość geograficzna używana, gdy mapa nie ma jeszcze aktywnego kontekstu miasta.",
    effect: "Przesuwa fallbackowy punkt startowy mapy na osi północ-południe.",
    range: "Wartość w stopniach geograficznych.",
  },
  "fallback-center-lon": {
    title: "Długość startowa",
    body: "Domyślna długość geograficzna używana razem z szerokością startową.",
    effect: "Przesuwa fallbackowy punkt startowy mapy na osi wschód-zachód.",
    range: "Wartość w stopniach geograficznych.",
  },
  "fallback-zoom": {
    title: "Zoom startowy",
    body: "Poziom przybliżenia dla pierwszego widoku, zanim użytkownik zmieni pozycję mapy.",
    effect: "Większa wartość pokazuje mniej obszaru i większe przybliżenie miejsc.",
    range: "Od 1 do 20.",
  },
  "marker-base-width": {
    title: "Bazowa szerokość kafla",
    body: "Szerokość miniatury miejsca przed skalowaniem przez zoom, priorytet redakcji i limity renderowania.",
    effect: "Większa wartość daje mocniejsze zdjęcia, ale zostawia mniej miejsca na inne kafle.",
    range: "W pikselach.",
  },
  "marker-base-height": {
    title: "Bazowa wysokość kafla",
    body: "Wysokość miniatury miejsca przed skalowaniem przez zoom, priorytet redakcji i limity renderowania.",
    effect: "Większa wartość poprawia ekspozycję zdjęć, ale szybciej zagęszcza widok.",
    range: "W pikselach.",
  },
  "marker-min-render-scale": {
    title: "Minimalna skala renderu",
    body: "Dolny limit końcowej skali kafla po zastosowaniu wszystkich reguł rozmiaru.",
    effect: "Chroni mniej ważne lub dalekie kafle przed staniem się zbyt małymi.",
    range: "Mnożnik rozmiaru bazowego.",
  },
  "marker-max-render-scale": {
    title: "Maksymalna skala renderu",
    body: "Górny limit końcowej skali kafla po zastosowaniu wszystkich reguł rozmiaru.",
    effect: "Powstrzymuje topowe miejsca przed przykryciem sąsiednich miniaturek.",
    range: "Mnożnik rozmiaru bazowego.",
  },
  "marker-priority-min-scale": {
    title: "Skala niskiego priorytetu",
    body: "Rozmiar kafla dla miejsca z najniższym priorytetem redakcji.",
    effect: "Niższa wartość mocniej wycisza miejsca, które mają być tylko tłem mapy.",
    range: "Mnożnik rozmiaru bazowego.",
  },
  "marker-priority-max-scale": {
    title: "Skala wysokiego priorytetu",
    body: "Rozmiar kafla dla miejsca z najwyższym priorytetem redakcji.",
    effect: "Wyższa wartość mocniej eksponuje miejsca, które redakcja chce pokazać jako pierwsze.",
    range: "Mnożnik rozmiaru bazowego.",
  },
  "marker-priority-curve": {
    title: "Krzywa rozmiaru priorytetu",
    body: "Tempo przejścia między rozmiarem niskiego i wysokiego priorytetu.",
    effect: "Większa wartość ostrzej wyróżnia topowe miejsca i spokojniej traktuje środek skali.",
    range: "Mnożnik krzywej.",
  },
  "marker-density-area": {
    title: "Powierzchnia viewportu na kafel",
    body: "Docelowa porcja ekranu rezerwowana na jedną miniaturę miejsca przy wyliczaniu limitu widocznych kafli.",
    effect: "Większa wartość pokazuje mniej kafli; mniejsza zwiększa gęstość tablicy miniaturek.",
    range: "W pikselach kwadratowych viewportu.",
  },
  "marker-density-min-zoom": {
    title: "Zoom startu zagęszczania",
    body: "Poziom przybliżenia, od którego mapa zaczyna zwiększać liczbę widocznych kafli.",
    effect: "Niższa wartość wcześniej pokazuje więcej miejsc, również z dalszej perspektywy.",
    range: "Poziom zoomu mapy.",
  },
  "marker-density-full-zoom": {
    title: "Zoom pełnej gęstości",
    body: "Poziom przybliżenia, przy którym mapa może użyć pełnego limitu widocznych kafli.",
    effect: "Niższa wartość szybciej przechodzi do bogatszej tablicy miniaturek.",
    range: "Poziom zoomu mapy.",
  },
  "marker-density-min-fill": {
    title: "Minimalne wypełnienie",
    body: "Część docelowego limitu kafli używana przy najdalszym dopuszczonym widoku.",
    effect: "Wyższa wartość zmniejsza ryzyko pustej mapy po oddaleniu.",
    range: "Ułamek limitu kafli.",
  },
  "marker-density-max-fill": {
    title: "Maksymalne wypełnienie",
    body: "Część docelowego limitu kafli dostępna przy pełnym zagęszczeniu.",
    effect: "Wyższa wartość pozwala pokazać więcej miejsc po przybliżeniu.",
    range: "Ułamek limitu kafli.",
  },
  "marker-density-curve": {
    title: "Krzywa gęstości",
    body: "Tempo narastania liczby widocznych kafli między zoomem startowym a pełnym.",
    effect: "Większa wartość dłużej utrzymuje spokojny widok i mocniej zagęszcza dopiero blisko.",
    range: "Mnożnik krzywej zoomu.",
  },
  "marker-priority-editorial": {
    title: "Waga priorytetu redakcji",
    body: "Wpływ ręcznego priorytetu miejsca na ranking kafli wybieranych do pokazania.",
    effect: "Wyższa wartość daje redakcji większą kontrolę nad tym, co przebija się na mapie.",
    range: "Mnożnik rankingu.",
  },
  "marker-priority-photos": {
    title: "Waga liczby zdjęć",
    body: "Wpływ liczby zatwierdzonych zdjęć miejsca na ranking widoczności kafla.",
    effect: "Wyższa wartość częściej pokazuje miejsca z bogatszą galerią publiczną.",
    range: "Mnożnik rankingu.",
  },
  "marker-priority-memories": {
    title: "Waga pamiątek",
    body: "Wpływ liczby zatwierdzonych pamiątek przypiętych do miejsca na ranking widoczności kafla.",
    effect: "Wyższa wartość mocniej eksponuje miejsca z materiałem społecznościowym.",
    range: "Mnożnik rankingu.",
  },
  "marker-priority-score": {
    title: "Waga score",
    body: "Wpływ ogólnego score miejsca na ranking kafli wybieranych do pokazania.",
    effect: "Wyższa wartość częściej pokazuje miejsca z mocniejszym wynikiem jakościowym.",
    range: "Mnożnik rankingu.",
  },
} satisfies Record<AdminMapSettingId, SettingHintCopy>;
