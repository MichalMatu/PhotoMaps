# AGENTS.md - PhotoMap

## Cel projektu

PhotoMap to globalny produkt: wizualna mapa miejsc z klimatem. Uzytkownik ma wejsc na mape miasta i od razu zobaczyc atrakcyjna tablice miniaturek miejsc: zdjecia, covery, pamiatki ludzi i proste trasy/kolekcje.

Wroclaw jest pierwszym miastem startowym i datasetem do strojenia produktu. Nie jest marka produktu ani ograniczeniem domeny. Repozytorium moze nadal nazywac sie technicznie PhotoMaps, ale w dokumentacji produktowej i UI uzywamy nazwy PhotoMap.

To jest nowy produkt, nie dalszy rozwoj WreckScanner. Repozytorium WreckScanner moze istniec w `_legacy/WreckScanner` tylko jako material referencyjny. Nie modyfikuj plikow w `_legacy` bez wyraznego polecenia uzytkownika.

## Rdzen Domeny

Centralnym bytem systemu jest `place`.

Wszystko inne jest warstwa przypieta do miejsca albo kolekcja miejsc:

```txt
place
 ├── category
 ├── photos
 ├── memories
 ├── guides / collections
 ├── reports
 └── future layers      zamrozone poza aktualnym etapem
```

Nie tworz osobnych swiatow dla zdjec, pamiatek, tras, audio, historii ani pieczatek. `City` jest kontekstem organizacyjnym, `Category` opisuje charakter miejsca, a `Photo`, `Memory`, `Guide/Route` i `Report` sa przypiete do miejsca albo kolekcji miejsc. Przyszle warstwy nie sa aktywnym zakresem.

Techniczne `guide` moze zostac w backendzie i API. Produktowo w UI i dokumentacji preferuj `trasa` albo `kolekcja miejsc`, zaleznie od kontekstu.

## Mapa Publiczna

Publiczna mapa jest glownym produktem i ma dzialac jak zywa tablica miniaturek miejsc, nie jak pusta mapa z pinami.

- Pierwszy widok ma od razu pokazywac atrakcyjne miniatury miejsc albo klastry miniaturek.
- Publiczne markery sa coverami/miniaturami miejsc; klasyczna pinezka zostaje tylko w adminie do wyboru lokalizacji.
- Klikniecie miejsca pokazuje wiecej, ale nie moze byc wymagane, zeby mapa robila efekt wizualny.
- Zoom steruje gestoscia i rozmiarem miniaturek: daleko mniej elementow i klastry, blisko wiecej miejsc oraz wachlarz podgladow.
- Warstwy mapy sa sposobem ogladania danych: polecane, galerie, pamiatki i proste kolekcje.
- Kategorie pochodza z admina/API; nie hardkoduj kategorii w filtrach UI.
- `map preview` ma pozostac lekkim kontraktem: miejsce, miasto, kategorie, score/liczniki, cover i kilka kuratorowanych podgladow.
- Nie laduj pelnych galerii ani pelnych pamiatek do pierwszego renderu mapy.
- Optymalizacja kontraktu mapy nie moze zamienic pierwszego widoku w pusta mape bez miniaturek.

## Tresc I Import

Admin sluzy do korekt, moderacji i pojedynczych zmian. Wieksze partie danych i kolejne miasta prowadzi content pipeline:

- manifesty w `content/cities/{city}/manifest.json`,
- redakcyjne assety w `assets/place-icons` jako opcjonalna warstwa jakosciowa,
- backup przez `scripts/backup_local_data.sh`,
- import przez `scripts/content/import_city.py`.

Szczegoly workflow sa w [docs/content-pipeline.md](docs/content-pipeline.md), [content/AGENTS.md](content/AGENTS.md) i [assets/place-icons/AGENTS.md](assets/place-icons/AGENTS.md).

## Jakosc Kodu

Domyslnie nie utrzymuj kompatybilnosci wstecznej dla wewnetrznych kontraktow. Jesli zmienia sie model, endpoint, pole requestu, konfiguracja, flaga albo komponent, w tej samej zmianie migruj aktualnych callerow i usun stare wejscia, fallbacki, adaptery, komentarze oraz martwe sciezki. Wyjatek tylko wtedy, gdy uzytkownik wyraznie poprosi o okres przejsciowy albo migracje danych produkcyjnych.

Kod ma byc prosty, modulowy i separowany wedlug odpowiedzialnosci:

- nie tworz zbednych warstw abstrakcji, wrapperow ani konfiguracji na pozniej,
- nie dopuszczaj do `god objectow`; rozbij plik, komponent, route albo serwis, jesli zaczyna obslugiwac kilka niezaleznych odpowiedzialnosci,
- logika domenowa nie powinna mieszkac w UI ani w route'ach, jesli nalezy do serwisu, helpera albo modelu,
- publiczny UI/API i admin UI/API trzymaj jako osobne przeplywy,
- zaleznosci dodawaj tylko wtedy, gdy rozwiazuja realny problem lepiej niz prosty kod lokalny,
- nie trzymaj martwych pol, stalych, typow, endpointow ani CSS po usunietych funkcjach.

## Jakosc UI

UI ma byc kompaktowy, spojny i minimalistyczny. Nie duplikuj tytulow, opisow, licznikow ani etykiet, jesli ta sama informacja jest juz widoczna w aktywnej karcie, filtrze, naglowku albo bezposrednim kontekscie.

- Wykorzystuj miejsce layoutem, zamiast rozpychac strone dodatkowymi naglowkami i opisami.
- Usuwaj lokalne naglowki sekcji, jesli tylko powtarzaja nazwe wybranej zakladki albo karty.
- Liczniki pokazuj w jednym sensownym miejscu.
- Tekst pomocniczy trzymaj krotko i blisko kontrolki.
- Formularze i modale projektuj mozliwie nisko i wasko, bez pustych obszarow i niepotrzebnych blokow tekstu.
- Modal albo sheet akcji pokazuje tylko dane potrzebne do tej akcji.
- Formularz dodawania nie powinien automatycznie pokazywac listy istniejacych rekordow.
- Jesli komponent ma kilka wariantow, nazwij tryb w API komponentu, np. `form-only`, `with-list`, `readonly`, zamiast dodawac luzne flagi boolean.

## Prywatnosc Mediow

Dla zdjec i pamiatek trzymaj zasade: oryginal trafia do private storage, publiczna kopia jest bezpieczna do zwrocenia przez API, a publiczne API nigdy nie ujawnia prywatnych sciezek. Publicznie widoczne sa tylko tresci zatwierdzone.

## Zakazane Slownictwo

Nie uzywaj w nowym kodzie, API, UI, modelach, komponentach ani nazwach plikow:

```txt
wreck
wrecks
vehicle
candidate
scan
YOLO
field_photo
report_package
savedWreck
```

Stare nazwy moga wystepowac tylko w `_legacy/WreckScanner` oraz w dokumentacji wyjasniajacej granice legacy.

## Testowanie

Kazda zmiana kontraktu albo zachowania powinna miec adekwatne pokrycie testami:

- test publicznego kontraktu API, jesli zmienia sie publiczny endpoint,
- test admin API, jesli zmienia sie akcja admina,
- test schematu albo migracji, jesli zmienia sie model bazy,
- build frontendu, jesli zmienia sie TypeScript albo komponenty,
- test helpera/trybu komponentu, jesli UI ma rozne warianty,
- diagnostyka albo skrypt check, jesli problem moze wrocic przez lokalne dane lub srodowisko.

Po wiekszej zmianie uruchom:

```bash
./scripts/check.sh
```

Nie ignoruj czerwonych testow komenda typu `|| true`. Jesli test nie moze przejsc z powodu znanego ograniczenia srodowiska, opisz to jawnie w podsumowaniu.

## Hierarchia AGENTS.md

Ten plik jest glownym kontraktem projektu. Lokalne `AGENTS.md` sluza tylko do trwalych granic odpowiedzialnosci i nie powinny powtarzac zasad z roota.

Przed edycja sciezki objetej lokalnym plikiem przeczytaj root `AGENTS.md` oraz najblizszy lokalny `AGENTS.md`.

- `backend/AGENTS.md` - backend FastAPI, modele, migracje, serwisy, storage i testy API.
- `frontend/AGENTS.md` - frontend React/Vite, klient API, style i ogolne reguly UI.
- `frontend/src/components/admin/AGENTS.md` - admin UI, CRUD, moderacja, raporty i flow korekt.
- `frontend/src/components/map/AGENTS.md` - publiczna mapa, miniatury, warstwy, sheets i markery.
- `content/AGENTS.md` - manifesty miast i redakcyjny content importowany masowo.
- `assets/place-icons/AGENTS.md` - cykl zycia redakcyjnych ikon miejsc.
- `scripts/content/AGENTS.md` - importer manifestow i jego kontrakt idempotencji.

## Kierunek Produktu

Biezacy kierunek produktu jest w [docs/product-direction.md](docs/product-direction.md). Nie dopisuj osobnych roadmap, list zadan ani rownoleglych planow produktu; jesli kierunek sie zmienia, aktualizuj ten dokument i powiazane lokalne kontrakty.
