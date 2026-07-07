# Create TTS

Ten plik opisuje roboczy sposob tworzenia opisow zdjec w PhotoMap tak, zeby jeden tekst dzialal jako opis widoczny na zdjeciu i jako material czytany przez TTS.

## Kontekst Aplikacji

- Opis jest przypiety do konkretnego `photo`, a zdjecie jest przypiete do konkretnego `place`.
- `photo.caption` to krotki podpis zdjecia. Limit backendu: 120 znakow.
- `photo.description_blocks` to dluzszy opis/narracja zdjecia. To lista blokow, nie markdown.
- Dozwolone typy blokow: `heading`, `subheading`, `paragraph`, `link`.
- Blok `link` musi miec `text` oraz poprawny adres `http/https` w `url`.
- TTS czyta tekst z tych samych blokow, ktore uzytkownik widzi w overlayu zdjecia.
- Dla TTS aplikacja splaszcza bloki do czystego tekstu i rozdziela je pustymi liniami.
- Linki sa wyswietlane jako linki, ale dla TTS liczy sie ich etykieta `text`; URL nie powinien byc materialem lektorskim.
- Plik audio jest osobnym zalacznikiem do zdjecia. Opis tekstowy nie jest plikiem audio, tylko zrodlem narracji albo tekstem do czytania w przegladarce.
- Publicznie widoczne sa tylko zatwierdzone media i bezpieczne publiczne sciezki.

## Cel Opisu Zdjecia

Opis zdjecia ma byc rozbudowana opowiescia turystyczna o miejscu pokazanym na zdjeciu. Zdjecie i jego nazwa sa punktem identyfikacji, ale nie gotowa formula pierwszego zdania. Najlepiej zaczac od rozpoznanego elementu: dziedzinca, pregierza, portalu, wiezy, kominka, bramy, skarpy, rzeki, sali albo pustego miejsca po czyms. Celem nie jest analiza kadru, kompozycji ani swiatla. Celem jest odpowiedz: dlaczego to miejsce jest ciekawe, jaka historia za nim stoi, jakie wydarzenia albo legendy do niego przylgnely i co warto zapamietac przed wizyta.

Opis ma laczyc cztery rzeczy:

1. Krotkie zakotwiczenie, o ktorym miejscu albo fragmencie miejsca mowimy.
2. Glowne, zrodlowo sprawdzone tlo: historia, wydarzenie, legenda, konflikt, przemiana albo lokalna osobliwosc.
3. Dwa lub trzy konkretne detale, ktore rozwijaja opowiesc i robia z niej pelniejsza narracje.
4. Powod, dla ktorego turysta moze chciec zobaczyc to miejsce na zywo.

To nie jest encyklopedyczny opis miejsca i nie jest opis fotografii. Pelny opis miejsca nalezy do `place.article_blocks`. Opis zdjecia ma dzialac jak samodzielna karta narracyjna przy konkretnym widoku: wystarczajaco dluga dla TTS, wciagajaca, historyczno-opisowa, czasem wydarzeniowa albo lekko zabawna, ale nadal zwiazana z tym, co widac na zdjeciu.

Najwazniejszy test jakosci: opis ma brzmiec tak, jakby dobry przewodnik stal z uzytkownikiem w miejscu zrobienia zdjecia i opowiadal konkretnie o tym obiekcie, tej ulicy, tym dziedzincu, tej wiezy, tej sali albo tym widoku. Sluchacz ma po opisie wiedziec wiecej niz przed chwila: kto, kiedy, dlaczego, co sie tu stalo, czemu zbudowano to wlasnie tutaj, jaka legenda albo anegdota trzyma sie tego miejsca i na jaki konkretny detal spojrzec na zywo.

## Zasada GIGO

Garbage in, garbage out: slaby wsad researchowy zawsze da slaby opis, nawet jesli styl bedzie ladny. Nie zaczynaj pisania, dopoki nie masz minimum:

- rozpoznanego `place` i konkretnego zdjecia albo miniatury,
- jednego glownego watku dla zdjecia, innego niz watki sasiednich zdjec tego samego miejsca,
- odpowiedzi "dlaczego tutaj" opartej na lokalizacji, funkcji, rzece, wzgorzu, trakcie, granicy, rynku, budynku albo instytucji,
- co najmniej trzech pewnych faktow z wiarygodnych zrodel,
- notatki, co jest faktem, co interpretacja, a co legenda albo lokalna opowiesc,
- jednego konkretnego detalu widocznego lub sensownego dla zdjecia,
- decyzji tonu: lekki, przewodnicki, powazny, refleksyjny, rodzinny, wydarzeniowy albo bez humoru.

Jesli ktoregos z tych elementow brakuje, najpierw uzupelnij research albo oznacz brak. Nie wypelniaj pustki zdaniami typu "miejsce ma wlasna pamiec", "kadr zaprasza do historii" albo "warto podejsc blizej". To sa objawy braku danych, nie styl.

## Profesjonalne Zasady Bazowe

Ten standard opiera sie na praktykach interpretacji dziedzictwa, pisania tekstow muzealnych i tworzenia audioprzewodnikow. Najwazniejsze wnioski do stosowania w PhotoMap:

- interpretacja nie jest lista faktow; ma laczyc ludzi z miejscami, obiektami i wydarzeniami oraz pomagac im odkryc znaczenie miejsca,
- dobry tekst projektuje doswiadczenie: gdzie uzytkownik stoi, co widzi, co porownuje, czego brakuje w przestrzeni i dlaczego to ma znaczenie,
- tekst musi miec temat interpretacyjny, czyli konkretna mysl laczaca widoczny detal z szerszym sensem,
- opis ma zaczynac sie od obiektu, pytania, kontrastu albo szczegolu, ktory uzytkownik moze sprawdzic wzrokiem,
- ludzie sa kluczem do pamieci: wlasciciele, mieszkancy, pracownicy, kupcy, dzieci, sluzba, robotnicy, pielgrzymi, przesiedlency albo wspolczesni uzytkownicy miejsca,
- pisanie do sluchania wymaga prostszych zdan, aktywnych czasownikow, jasnych przejsc i testu czytania na glos,
- dlugi opis PhotoMap nie moze byc jednym nieprzerwanym nagraniem muzealnym; ma byc warstwowa karta przewodnicka, w ktorej pierwsze bloki dzialaja samodzielnie, a dalsze bloki poglebiaja historie,
- ton musi pasowac do tematu; humor odpada przy miejscach pamieci, przemocy, sacrum, chorobie, biedzie i tragedii,
- dobra redakcja wymaga testu na odbiorcy: po przeczytaniu pierwszych 2-3 blokow uzytkownik ma wiedziec, dlaczego warto sluchac dalej.

Przydatne zrodla metodyczne:

- National Lottery Heritage Fund, interpretation guidance: https://www.heritagefund.org.uk/funding/good-practice-guidance/interpretation
- National Park Service, Foundations of Interpretation: https://www.nps.gov/zion/getinvolved/upload/CUA_FoundationsCurriculum_12_21_16.pdf
- Interpret Europe, Engaging your visitors: https://www.interpret-europe.net/fileadmin/Documents/interpret_europe_engaging_your_visitors.pdf
- Museums Galleries Scotland, Creating interpretive text: https://www.museumsgalleriesscotland.org.uk/advice-article/creating-interpretive-text/
- British Museum, interpretation guidelines: https://www.bmitpglobalnetwork.org/wp-content/uploads/2024/01/British-Museum-Interpretation-Guidelines-PDF-VERSION.pdf
- Heritage Council, Museum Displays and Interpretation: https://www.heritagecouncil.ie/content/files/AIM-Succes-Guide-Museum-Displays-and-Interpretation.pdf
- Nubart, museum audio guide script best practices: https://www.nubart.eu/audio-guides/content-production/writing-museum-guide-scripts.html
- Audio-Cult, audio tour writing guidance: https://en.audio-cult.com/wie-schreibt-man-eine-audiofuhrung

## Twardy Standard Konkretu

Kazdy opis musi byc oparty na lokalnych szczegolach, nie na ogolnym szablonie dla typu atrakcji.

Opis standardowy musi zawierac:

- minimum trzy konkretne informacje zwiazane z tym jednym miejscem: date, osobe, rod, zakon, ulice, rzeke, wzgorze, trase, granice, funkcje budynku, nazwe sali, nazwe legendy, nazwe wydarzenia albo nazwe przebudowy,
- wyjasnienie "dlaczego tutaj": dlaczego zamek, palac, klasztor, most, rynek, uzdrowisko albo muzeum powstalo w tej lokalizacji, np. przy przeprawie, na wzgorzu, na granicy dawnych ksiestw, przy trakcie handlowym, nad konkretna rzeka, w dawnym zbiorniku, przy fortyfikacji albo w centrum dawnego miasta,
- co najmniej jeden przyklad natychmiast po kazdym ogolnym watku. Jesli tekst mowi o "legendach", musi podac konkretna legende. Jesli mowi o "przemyslowych sladach", musi podac konkretny przemysl, kopalnie, hute, wiadukt, zbiornik albo zaklad. Jesli mowi o "nakladaniu sie epok", musi nazwac epoki albo przebudowy widoczne w tym miejscu,
- minimum dwie male sceny do wyobrazenia: kto tu szedl, modlil sie, bronil przejscia, handlowal, pracowal, mieszkal, uciekal, odpoczywal albo zwiedzal,
- jedna konkretna wskazowke obserwacyjna: "spojrz na polnocny mur", "wejdz na dziedziniec", "porownaj drewniana konstrukcje z malowanymi emporami", "zobacz jak rzeka odcina wzgorze", "poszukaj sladu dawnej bramy".

Nie wolno zastepowac researchu ladnym ogolnikiem. Zdanie typu "Dolnoslaskie zamki zwykle stoja w miejscach, gdzie krajobraz pomagal obronie" jest dopuszczalne tylko wtedy, gdy nastepne zdanie od razu mowi, jak dokladnie dziala to w tym miejscu: jaka rzeka, jakie wzgorze, jaki trakt, jaka granica albo jaka funkcja obronna.

Slowa "zamek", "palac", "rynek", "klasztor", "most", "jaskinia", "park" albo "muzeum" nie sa jeszcze informacja. Informacja zaczyna sie dopiero tam, gdzie pojawia sie lokalna odpowiedz: Zamek Ksiaz nad wawozem Pelcznicy, Most Tumski miedzy Wyspa Piasek a Ostrowem Tumskim, Hydropolis w dawnym zbiorniku wody czystej przy Na Grobli, Kosciol Pokoju w Swidnicy po wojnie trzydziestoletniej, albo Zamek Czocha przy dawnym pograniczu slasko-luzyckim.

## Warstwa Ludzka I Pamiec Po Odsluchu

Opis ma zostawiac po sobie cos, co wroci do uzytkownika, gdy stanie przy miejscu: obraz, pytanie, lekki moral, kontrast albo ludzka sytuacje. Same fakty sa szkieletem. Dobra opowiesc potrzebuje jeszcze ludzi, konsekwencji i sceny, ktora da sie zapamietac.

"Podkolorowanie" jest dozwolone tylko jako narracyjne ozywienie sprawdzonych faktow, nie jako wymyslanie historii. Mozna pisac "mozna sobie wyobrazic", "latwo pomyslec", "ten kontrast jest mocny", jesli scena wynika z realnego kontekstu miejsca. Nie wolno dopisywac niepotwierdzonych romansow, zbrodni, cytatow, duchow, dialogow ani emocji konkretnych osob jako faktu.

Lekki humor jest dobry, jesli wyrasta z konkretnego detalu miejsca: monogramu, napisu, herbu, rzezby, nazwy ulicy, dawnej funkcji albo lokalnej dwuznacznosci. Ma dzialac jak przewodnickie mrugniecie, po ktorym tekst wraca do historii. Przyklad: monogram `WC` na kominku Cecylii i Wilhelma mozna krotko zestawic z dzisiejszym skojarzeniem z toaleta, ale puenta musi prowadzic do tego, ze w zamku te litery oznaczaly dwoje ludzi, ich rezydencje i swiat po upadku monarchii. Humor nie moze wysmiewac miejsca, osoby, sacrum, biedy, choroby, przemocy ani tragedii.

Jesli w opisie pojawia sie postac, nie zostawiaj jej jako nazwiska. Daj jej miniopowiesc:

- kim byla w momencie zwiazanym z miejscem,
- co w jej zyciu zmienilo sie przez wydarzenie, wojne, przebudowe, utrate wladzy, prace albo codzienny obowiazek,
- jaki konkretny obraz mozna z nia polaczyc na miejscu: okno, dziedziniec, brama, sala, korytarz, rynek, most, lawka, peron, fosa, klatka schodowa,
- jaka mysl zostaje po tej historii.

Przyklad: Cecylia przy zamku w Olesnicy nie powinna byc tylko "ludzkim tropem". Trzeba pokazac kontrast: kobieta z dawnej cesarskiej rodziny, po upadku monarchii, mieszka z dziecmi w zamku, ktory wczesniej byl znakiem ksiazecej wladzy. To moze zostawic mysl, ze wielka historia czesto konczy sie bardzo zwyczajnie: pokojami, dziecmi, rzeczami do spakowania, cisza po tytulach i miejscem, ktore zostaje dluzsze niz ludzkie ambicje.

Kazdy pelny opis powinien miec:

- co najmniej dwa przyklady z realnego zycia: mieszkaniec, podrozny, kupiec, mnich, ksiezna, robotnik, straznik, uczen, turysta, rzemieslnik, urzednik albo rodzina,
- jedna scene codzienna albo wydarzeniowa oparta na realnym kontekscie miejsca,
- jedna puenta, ktora nie jest sloganem, tylko mysla do zabrania ze soba,
- jeden detal, ktory po odsluchu uzytkownik bedzie chcial odnalezc wzrokiem.

Nie koncz opisu tylko informacja. Koncz go wspomnieniem: "gdy staniesz przy tej bramie, latwiej zrozumiec...", "ten detal przypomina, ze...", "najmocniejsze jest tu nie to, ze mury przetrwaly, ale to, ile razy zmienialy znaczenie".

## Standard Interpretacyjny Przewodnika

Kazdy opis ma byc nie tylko dlugi i ciekawy, ale tez interpretacyjny. Dobre przewodniki nie sa lista faktow. Projektuja doswiadczenie uzytkownika: gdzie stoi, co widzi, co ma sprawdzic wzrokiem, jaka historia laczy sie z detalem i jaka mysl moze zostac po odejsciu.

Przed pisaniem kazdego opisu przygotuj osiem elementow interpretacyjnych:

1. `temat interpretacyjny` - jedno zdanie laczace widoczny detal z sensem miejsca. To nie moze byc temat typu "zamek" albo "rynek". To ma byc zdanie, np. "brama pokazuje, jak dawna obrona zamienila sie w reprezentacje" albo "pregierz przypomina, ze rynek byl tez miejscem publicznej kontroli".
2. `IPOP` - wybierz wejscie w opowiesc: `Ideas`, `People`, `Objects`, `Physical`. W galerii jednego miejsca mieszaj te wejscia: jedno zdjecie przez idee, drugie przez osobe, trzecie przez obiekt, czwarte przez cialo/przestrzen.
3. `instrukcja terenowa` - zaplanuj, co sluchacz ma zrobic oczami albo ruchem: spojrz w prawo, podejdz pod brame, porownaj mur, obejdz naroznik, popatrz na puste miejsce, zatrzymaj sie przy tablicy. Nie musi to byc komenda w kazdym akapicie, ale opis ma miec rytm przewodnika w terenie.
4. `obecne kontra nieobecne` - ustal, co widac dzisiaj i czego juz nie widac: zburzona sala, nieistniejace skrzydlo, dawny trakt, zasypana fosa, odbudowana pierzeja, pusty plac po budynku, przemieniona funkcja.
5. `wieloglos` - znajdz mozliwe glosy opowiesci: kronikarz, kurator, przewodnik, mieszkaniec, robotnik, ksiezna, kupiec, zakonnik, wiezien, dziecko, dokument, legenda. Nie wymyslaj cytatow. Mozesz parafrazowac perspektywe, jesli wynika ze zrodel.
6. `perspektywy pomijane` - oprocz wladcow, fundatorow i architektow szukaj ludzi mniej oczywistych: sluzby, kobiet, dzieci, rzemieslnikow, kupcow, robotnikow, wiezniow, przesiedlencow, powojennych mieszkancow, lokalnej spolecznosci.
7. `warstwowy opis` - pierwsze 2-3 bloki musza dzialac jako mocny rdzen dla osoby, ktora przeczyta tylko poczatek. Dalsze bloki sa poglbieniem: druga historia, detal, perspektywa, kontrast, terenowa wskazowka, puenta.
8. `miejsce na reakcje uzytkownika` - nie mow uzytkownikowi, co ma czuc. Zamiast "to wzruszajace" albo "to niesamowite" daj obraz, kontrast albo pytanie, z ktorego emocja wyniknie sama.

## Dynamiczne Przewodniki Zewnetrzne

Przed pisaniem opisow dynamicznie sprawdz, czy dla danego miejsca istnieja juz przewodniki albo materialy przewodnikowe. Szukaj szczegolnie:

- oficjalnych audio guide, transkryptow, PDF-ow, planow zwiedzania i aplikacji przewodnikowych miejsca,
- stron "zwiedzanie", "trasa", "history and stories", "plan zwiedzania", "edukacja", "dla zwiedzajacych", "sciezka edukacyjna",
- miejskich spacerownikow, tras tematycznych, map turystycznych i materialow instytucji kultury,
- muzealnych opisow sal, gablot, wystaw, dziedzincow, wiez, kaplic, ogrodow albo punktow widokowych,
- lokalnych przewodnikow, blogow historycznych i opracowan regionalnych, jesli sa wiarygodne i oznaczaja legendy jako legendy.

Hierarchia zrodel:

1. Oficjalne strony miejsca, muzeum, miasta, konserwatora, instytucji kultury albo zarzadcy.
2. Oficjalne przewodniki, transkrypty audioguide, plany zwiedzania, katalogi wystaw i materialy edukacyjne.
3. Publikacje naukowe, regionalne monografie, biblioteki cyfrowe, archiwa, mapy historyczne i zrodla konserwatorskie.
4. Wiarygodne lokalne portale historyczne, przewodnicy miejscy, blogi regionalne i trasy turystyczne z podanymi zrodlami.
5. Agregatory turystyczne, listy atrakcji i teksty SEO tylko jako trop do dalszego sprawdzenia, nigdy jako jedyne zrodlo faktu.

Z przewodnikow nie kopiuj tekstu. Wykorzystuj je jako material analityczny:

- wyciagnij, ktore obiekty przewodnik uwaza za najwazniejsze,
- sprawdz, jaka kolejnosc zwiedzania proponuje i dlaczego,
- zanotuj instrukcje terenowe: gdzie stanac, gdzie spojrzec, co porownac, co znajduje sie po lewej/prawej stronie,
- wychwyc najlepiej dzialajace kontrasty: triumf/upadek, obrona/dom, handel/kara, sacrum/polityka, przemysl/codziennosc, pustka/dawna zabudowa,
- zanotuj historie ludzi i przedmiotow, ktore przewodnik wykorzystuje do ozywienia miejsca,
- sprawdz, czy przewodnik pokazuje cos, czego zwykly opis miejsca nie ma: glos kuratora, swiadka, mieszkanca, dawna funkcje albo detal "nieoczywisty".

Nie wolno przepisywac cudzych przewodnikow ani dlugich fragmentow. Do opisu PhotoMap wplataj tylko wlasnymi slowami: motywy, fakty, punkty obserwacyjne, kolejnosc patrzenia, kontrasty i tropy narracyjne. Jesli korzystasz z czyjegos sformulowania, moze to byc co najwyzej bardzo krotki cytat i tylko wtedy, gdy ma realna wartosc. Domyslnie parafrazuj.

Jesli nie znajdziesz zadnego przewodnika dla miejsca, zapisz w notatce roboczej "brak dostepnego przewodnika" i oprzyj opis na oficjalnych stronach, lokalnych opracowaniach, mapie, zdjeciu i zrodlach historycznych.

## Procedura Dla Serii Zdjec

Przy wielu zdjeciach jednego miejsca nie generuj opisow po kolei "od gory listy". Najpierw zbuduj redakcyjna mape galerii:

1. Zbierz wszystkie zdjecia miejsca dostepne w projekcie i zapisz, co widac na kazdym: fasada, dziedziniec, wnetrze, detal, pomnik, widok, wejscie, tablica, fragment ulicy, panorama albo pusta przestrzen po czyms.
2. Przygotuj bank watkow miejsca: fakty, osoby, legendy, wydarzenia, przebudowy, funkcje, konflikty, codziennosc, powojenne zmiany, przyroda, technika, nazwy, humor i lokalne dwuznacznosci.
3. Przypisz watki do zdjec tak, zeby kazde zdjecie mialo inny glowny temat i inne wejscie IPOP.
4. Ustal, ktore fakty sa wspolnym kontekstem miejsca. Wolno je powtarzac tylko krotko, najlepiej jednym zdaniem, gdy sa potrzebne do zrozumienia nowego watku.
5. Dla kazdego zdjecia zapisz jedna obietnice dla sluchacza: "po tym opisie uzytkownik zapamieta...".
6. Dopiero potem pisz opisy i sprawdzaj je parami, zeby wykryc powtorzone tytuly, pierwsze zdania, legendy, puenty i uklady akapitow.

Dobry zestaw opisow dziala jak spacer z przewodnikiem. Jedno zdjecie moze byc rozdzialem o wladzy, drugie o handlu, trzecie o karze publicznej, czwarte o osobie, piate o odbudowie, szoste o detalu, siodme o tym, czego juz nie ma. Zly zestaw brzmi jak ta sama notka encyklopedyczna przepisana innymi slowami.

## Antyduplikacja W Galerii Miejsca

Jedno miejsce moze miec wiele zdjec, ale uzytkownik nie moze slyszec tej samej historii w kolko. Opis jednego zdjecia ma byc jednym rozdzialem opowiesci o miejscu, nie streszczeniem calego miejsca powtarzanym przy kazdej fotografii.

Przed pisaniem opisow dla kilku zdjec tego samego `place` przygotuj mape watkow:

- wypisz wszystkie zdjecia miejsca i rozpoznaj, co konkretnie widac na kazdym z nich,
- podziel historie miejsca na osobne watki: obiekt glowny, detal, postac, legenda, wydarzenie, przebudowa, funkcja, handel, wojna, odbudowa, codzienny rytual, punkt widokowy, anegdota,
- przypisz kazdemu zdjeciu jeden glowny watek i 1-2 watki pomocnicze,
- nie przypisuj tej samej legendy, tej samej anegdoty ani tego samego zestawu faktow do dwoch zdjec, chyba ze drugie zdjecie pokazuje inny element tej historii i wnosi nowa perspektywe,
- jesli krotkie przypomnienie kontekstu miejsca jest potrzebne, ogranicz je do jednego zdania i od razu przejdz do nowego watku,
- tytuly `caption` w jednej galerii musza byc unikalne i dopasowane do konkretnego zdjecia, nie do samego `place`.

Dla duzych galerii, np. Rynku we Wroclawiu z kilkudziesiecioma zdjeciami, nie pisz czterdziestu wariantow tej samej opowiesci o Ratuszu. Rozdziel material na rozne rozdzialy: pregierz, Ratusz, Sukiennice, kamienice pod konkretnymi nazwami, pierzeje, handel, kary publiczne, odbudowe po 1945 roku, dawne jarmarki, detale fasad, fontanny, pomniki, przejscia, bramy i widoki z narozy placu. Kazde zdjecie ma dostac swoj powod istnienia.

Jezeli zdjecia sa bardzo podobne, tym bardziej nie powtarzaj tej samej historii. Wtedy zmien skale opowiesci: jedno zdjecie moze opowiadac o calym miejscu, drugie o widocznym detalu, trzecie o postaci, czwarte o wydarzeniu, piate o powojennej odbudowie, a kolejne o tym, jak miejsce dziala dzisiaj w ruchu miasta.

## Format Wyjsciowy

Dla kazdego zdjecia przygotuj:

```json
{
  "caption": "Krotki podpis do 120 znakow",
  "description_blocks": [
    { "type": "heading", "text": "Opcjonalny krotki tytul sceny" },
    { "type": "paragraph", "text": "Pierwszy akapit opisu." },
    { "type": "subheading", "text": "Opcjonalna etykieta zmiany tematu" },
    { "type": "paragraph", "text": "Kolejny akapit opisu." },
    { "type": "paragraph", "text": "Kolejny akapit opisu." }
  ]
}
```

Domyslnie uzywaj jednego `heading`, dwoch lub trzech `subheading` oraz tylu blokow `paragraph`, ile potrzebuje opowiesc; pelny opis zwykle zaczyna sie od co najmniej siedmiu akapitow. `subheading` stosuj jako pauze narracyjna: "Historia", "Legenda", "Warto wiedziec", "Maly zwrot akcji", "Co widac na miejscu". `link` dodawaj rzadko; atrybucja zdjecia ma wlasne pola i nie powinna byc powtarzana w opisie.

## Formatowanie Wizualne

Nie dodawaj nowych typow formatowania bez decyzji produktowej. Obecne bloki wystarczaja do ladnego rytmu wizualnego, jesli sa uzywane konsekwentnie:

- `heading` to haczyk opowiesci, nie techniczny tytul zdjecia.
- `subheading` to mala etykieta zmiany tonu, np. "Ciekawostka", "Legenda", "Maly zwrot akcji", "Warto wiedziec".
- `paragraph` niesie wlasciwa opowiesc.
- `link` sluzy do pojedynczego materialu zewnetrznego, ale nie do atrybucji zdjecia.

Najlepszy domyslny uklad:

```json
[
  { "type": "heading", "text": "Krotki haczyk opowiesci" },
  { "type": "paragraph", "text": "Zakotwiczenie zdjecia i wejscie w historie." },
  { "type": "subheading", "text": "Historia" },
  { "type": "paragraph", "text": "Rozwiniecie sprawdzonego faktu albo wydarzenia." },
  { "type": "paragraph", "text": "Drugi akapit z konkretnym detalem, nazwiskiem, epoka albo przemiana." },
  { "type": "subheading", "text": "Warto wiedziec" },
  { "type": "paragraph", "text": "Turystyczna puenta zwiazana z tym, co widac na zdjeciu." }
]
```

Uklad dla legendy albo anegdoty:

```json
[
  { "type": "heading", "text": "Tytul z lekkim napieciem" },
  { "type": "paragraph", "text": "Wskazanie miejsca ze zdjecia i fakt historyczny, ktory buduje kontekst legendy." },
  { "type": "subheading", "text": "Legenda" },
  { "type": "paragraph", "text": "Legenda albo anegdota, jasno pokazana jako opowiesc, nie pewny fakt." },
  { "type": "paragraph", "text": "Dlaczego ta legenda trzyma sie miejsca i co turysta moze zobaczyc, zeby sam ja poczuc." }
]
```

Uklad dla covera:

```json
[
  { "type": "heading", "text": "Najmocniejszy powod, zeby tu kliknac" },
  { "type": "paragraph", "text": "Pierwsze zdanie od razu mowi, co to za miejsce i jaki ma haczyk historyczny." },
  { "type": "paragraph", "text": "Drugi akapit buduje scene: kto tu mieszkal, co sie zmienilo, dlaczego miejsce bylo wazne." },
  { "type": "subheading", "text": "Historia pod powierzchnia" },
  { "type": "paragraph", "text": "Sprawdzony fakt, wydarzenie albo tajemnica, ktora nadaje miejscu glebie." },
  { "type": "subheading", "text": "Dlaczego warto" },
  { "type": "paragraph", "text": "Turystyczna puenta bez reklamowego tonu, zwiazana z pierwszym wrazeniem ze zdjecia." }
]
```

Nie rob wizualnej sciany tekstu. Przy dluzszych opisach rozbij tekst na czytelne akapity i dodawaj `subheading`, gdy zmienia sie temat: od obrazu do historii, od historii do legendy, od legendy do wskazowki dla turysty. Nie dawaj naglowka po kazdym akapicie, bo TTS zacznie brzmiec poszatkowanie.

Potencjalne przyszle formaty, jesli obecne bloki przestana wystarczac, to pojedynczy `fact` albo `callout`. Na razie ich nie dodawaj: wymagalyby zmiany backendowego enumu, serializerow, klienta API, renderera i testow.

## Styl Startowy

Domyslny styl to turystyczna opowiesc historyczna w tonie edutainment: ma uczyc mimochodem, ale przede wszystkim dawac przyjemnosc sluchania. Tekst ma brzmiec jak zywa opowiesc przewodnika w terenie, nie jak opis wygenerowany wedlug wzoru.

- pisz po polsku, prostym i naturalnym jezykiem,
- brzmi jak dobry lokalny przewodnik, nie jak Wikipedia i nie jak reklama,
- zaczynaj od miejsca, nazwy zdjecia, rozpoznanego obiektu albo intrygujacego faktu, a nie od opisu kompozycji zdjecia,
- pierwszy wers moze miec formule: "To zdjecie pokazuje..." albo "Na tym ujeciu jest...", ale tylko raz i tylko wtedy, gdy od razu prowadzi do konkretnej historii miejsca,
- wybieraj jeden glowny watek, ale rozwijaj go przez kilka konkretnych detali, scen albo zwrotow akcji,
- traktuj entertainment jako priorytet: dobra opowiesc, zaskoczenie, kontrast albo lekki zwrot sa wazniejsze niz komplet informacji,
- dobrze dzialaja: dawne funkcje budynku, przebudowy, legendy, nietypowi wlasciciele, ukryte przejscia, spory, powojenne przemiany, zapomniane detale, lokalne zwyczaje i zabawne kontrasty,
- pokazuj Dolny Slask jako region warstw: zamki, palacyki, uzdrowiska, podziemia, skaly, koleje, mosty, klasztory, przemysl, pogranicze i miasta po wielu zmianach,
- uzywaj lekkiego zaproszenia do odwiedzin, ale bez nachalnych hasel typu "musisz zobaczyc",
- unikaj pustych zachwytow typu "magiczne miejsce", "wyjatkowy klimat", "must see",
- nie wymyslaj faktow, dat, legend, nazwisk, cen, godzin otwarcia ani wydarzen, ktorych nie ma w danych albo nie zostaly zweryfikowane w zrodlach,
- nie opisuj atrybucji, licencji ani zrodla zdjecia w `description_blocks`,
- nie wspominaj o TTS, lektorze, algorytmie ani tym, ze tekst zostal wygenerowany,
- nie mow uzytkownikowi, co ma czuc; opowiedz historie tak, zeby sam chcial sprawdzic miejsce.

## Antywzorce Do Usuniecia

Nie wolno uzywac mdlego meta-jezyka o samym opisie, zdjeciu albo aplikacji. Problemem nie jest samo zakotwiczenie opowiesci w obrazie. Problemem jest sytuacja, w ktorej slowa "kadr", "zdjecie" albo "punkt wejscia" zastepuja rozpoznanie konkretnego elementu widocznego na zdjeciu.

Zakazane sa zwlaszcza puste frazy i konstrukcje w tym stylu:

- "to dobry punkt startu do opowiesci",
- "zdjecie zakotwicza wzrok",
- "tekst prowadzi glebiej",
- "kadr dziala jak punkt wejscia",
- "mala brama do miejsca",
- "wlasna funkcja, pamiec i rytm",
- "taki opis najlepiej dziala",
- "opis zostawia jedna prosta zachete",
- "dobre zdjecie powinno zostawic chec",
- "wystarczy uchwycic, ze miejsce ma sens",
- "nie trzeba opisywac kazdego elementu obrazu",
- "przejsc od samego faktu do sposobu ogladania",
- "potraktowac kadr jak wejscie w historie ludzi".

Te zdania nie dodaja historii, jesli stoja same. Zastepuj je konkretnym obiektem i od razu rozwijaj jego znaczenie:

- zamiast "zamek ma wlasna funkcje i pamiec" napisz, kto go zbudowal, komu sluzyl i co kontrolowal,
- zamiast "zamek stal przy dawnym trakcie" podaj nazwe kierunku, miasta, rzeki albo granicy, jesli da sie to zweryfikowac,
- zamiast "nakladanie sie epok" nazwij epoki: gotycka wieza, renesansowy dziedziniec, barokowa przebudowa, powojenna odbudowa,
- zamiast "legendy i przemyslowe slady" podaj konkretna legende albo konkretny slad: Liczyrzepa, Kunegunda, projekt Riese, dawny zbiornik wody, huta szkla, kopalnia zlota, wiadukt kolejowy,
- zamiast "podejdz blizej i znajdz detal" powiedz, jaki detal: brama od rynku, polnocny mur, empory, stara klatka schodowa, pylon mostu, arkady wiaduktu, taras nad rzeka.

Dobre zakotwiczenie wizualne jest pozadane, jesli wskazuje realny element obrazu:

- "Przed wroclawskim Ratuszem wzrok przyciaga pregierz" jest dobrym startem tylko wtedy, gdy nastepne zdania opowiadaja historie pregierza: do czego sluzyl, jakie kary publiczne symbolizowal, co stalo sie z nim po wojnie i jak dzis pracuje w przestrzeni Rynku,
- "Na dziedzincu zamku wzrok zatrzymuje brama" jest dobrym startem tylko wtedy, gdy tekst przechodzi do tej bramy: kto przez nia wjezdzal, co chronila, z jakiej przebudowy pochodzi albo jaki detal warto na niej zobaczyc,
- "W tym ujeciu najwazniejszy jest mur od strony rzeki" jest dobrym startem tylko wtedy, gdy tekst wyjasnia, jak rzeka, skarpa albo fosa pomagaly obronie dokladnie tego miejsca.

Mozna pisac, ze element "przykuwa wzrok", "prowadzi opowiesc" albo "jest punktem wejscia", ale podmiotem ma byc konkretny element widoczny na zdjeciu: pregierz, wieza, portal, brama, empora, pylon, arkada, kaplica, taras, skarpa, rzeka albo sala. Nie wolno zostawic podmiotem abstrakcyjnego "kadru".

Nie pisz "w takich miejscach", "przy takim zdjeciu", "tego typu obiekty" ani "Dolnoslaskie zamki zwykle..." jako glownego rozwiniecia. Mozna uzyc jednego zdania porownawczego, ale rdzeniem akapitu musi byc konkretna lokalizacja i jej wlasna historia.

Nie uzywaj listy mozliwosci typu "legenda, przemyslowy slad albo miejski rytual". Jesli wymieniasz zjawisko, wybierz jedno i od razu podaj przyklad. Dla sluchacza lepsza jest jedna dobra historia niz trzy puste zapowiedzi.

## Dlugosc I Rytm TTS

Opis musi dobrze brzmiec po odczytaniu na glos:

- traktuj liczbe slow jako diagnostyke, nie jako cel sam w sobie; dobra dlugosc wynika z konkretu, researchu, roli zdjecia w galerii i tego, ile nowej opowiesci da sie uczciwie dodac,
- nie ma gornego limitu slow: jesli historia jest ciekawa, konkretna, dobrze udokumentowana i dobrze brzmi w TTS, moze byc dluzsza,
- nie stosuj sztywnego minimum dla kazdego zdjecia. Zbyt twardy prog prowokuje dopisywanie akapitow "pod licznik", a dlugi pusty opis jest gorszy niz krotszy, uczciwy i konkretny,
- dla covera albo najmocniejszego zdjecia miejsca celuj zwykle w 1000+ slow, jezeli sa dobre zrodla i obraz niesie szeroka historie miejsca,
- dla standardowego zdjecia z osobnym watkiem celuj zwykle w 650-1000+ slow: opis ma miec pelny luk, ale nie musi sztucznie powtarzac kontekstu znanego z innych zdjec tego samego miejsca,
- dla prostego detalu, bardzo podobnego ujecia pomocniczego albo zdjecia z ubogim kontekstem dopuszczalne jest 450-700 slow, jesli tekst nadal ma konkretny detal, zrodlowy fakt, scene ludzka, wskazowke obserwacyjna i jasna puentę,
- jesli opis jest krotszy niz orientacyjny zakres, powodem ma byc uczciwy brak materialu albo decyzja antyduplikacyjna, nie lenistwo researchowe; jesli jest dluzszy, kazdy dodatkowy segment musi wniesc nowa scene, osobe, fakt, kontrast, legende, brakujacy slad albo praktyczna wskazowke,
- nigdy nie poprawiaj opisu przez samo wydluzanie. Najpierw dodaj brakujacy fakt, scene, detal, konflikt, osobe albo lokalny trop. Jesli nie da sie dodac nic konkretnego, zostaw krocej i oznacz luke w notatce roboczej,
- dziel tekst na tyle blokow narracyjnych, ile potrzebuje historia; przy pelnym opisie zwykle zaczynaj od co najmniej 7 blokow, zeby overlay i TTS mialy naturalny rytm,
- pierwszy segment, czyli `heading` i pierwsze 2-3 bloki, musi dzialac jak samodzielna miniopowiesc: ma nazwac miejsce, dac haczyk, odpowiedziec "dlaczego to wazne" i zostawic powod, zeby sluchac dalej,
- dalsze segmenty maja byc poglebieniem, nie dopisywaniem tej samej mysli innymi slowami; kazdy segment powinien wniesc nowa scene, osobe, konflikt, detal, brakujacy slad albo puente,
- co 150-250 slow powinien pojawic sie naturalny oddech: zmiana akapitu, subheading, pytanie terenowe, obserwacja albo domkniecie malego watku,
- pisz zdania krotkie albo srednie,
- jedno zdanie powinno miec jedna glowna mysl,
- zaczynaj zdania aktywnie, gdy to mozliwe: "kupcy stawiali stragany", "ksiezna przeniosla rzeczy", "rzeka odcinala wzgorze", zamiast ciezkich konstrukcji biernych,
- daty i liczby podawaj tylko wtedy, gdy pomagaja zrozumiec zwrot akcji, skale albo chronologie; nie rob z opisu osi czasu,
- uzywaj kropek czesciej niz wielokrotnych przecinkow,
- unikaj nawiasow, skrotow, list w srodku akapitu i zdan z duza liczba nazw wlasnych,
- akapity traktuj jak pauzy: kazdy powinien byc zamknieta czescia narracji.

Profesjonalne audioprzewodniki czesto trzymaja pojedynczy stop bardzo krotko, bo sluchacz stoi w tlumie i latwo traci koncentracje. PhotoMap ma inny cel: opis jest dluzsza karta przewodnicka do czytania i sluchania. Dlatego nie wprowadzamy gornego limitu slow ani jednego sztywnego minimum dla wszystkich zdjec, ale wymagamy warstwowej budowy. Uzytkownik powinien dostac wartosc po pierwszym segmencie, a jesli slucha dalej, kazdy kolejny segment ma mu dac nowy powod, nie tylko wiecej tekstu.

Przegladarkowy TTS dzieli tekst na mniejsze fragmenty, wiec dobrze dzialaja domkniete zdania, naturalne pauzy miedzy blokami i brak zdan, ktore niosa zbyt wiele informacji naraz.

Opis nie moze sprawiac wrazenia, ze historia dopiero sie zaczyna i nagle konczy. Dlugosc ma sluzyc pelnemu lukowi, a nie odwrotnie. Tekst musi zawierac:

1. wejscie w konkretne miejsce,
2. przyczyne powstania albo znaczenia miejsca,
3. jedna glowna historie z datami, osobami albo wydarzeniem,
4. drugi poziom: legenda, anegdota, przebudowa, wojna, przemiana funkcji albo detal architektoniczny,
5. warstwe ludzka: scene z zycia, konsekwencje dla konkretnej osoby albo zwykly codzienny obraz,
6. wskazowke, co dokladnie zobaczyc stojac na miejscu,
7. puenta, ktora domyka opowiesc, zostawia mysl i nie komentuje samego opisu.

## Relacja Do Obrazu

Opis powinien byc zwiazany z miejscem pokazanym na zdjeciu, ale nie powinien tlumaczyc kompozycji fotografii. Zdjecie odpowiada na pytanie "o ktorym miejscu mowimy"; tekst odpowiada na pytanie "jaka historia, ciekawostka albo lokalna osobliwosc sprawia, ze warto tu przyjechac".

O zdjeciu albo kadrze wspominaj najwyzej raz na poczatku. Nie wracaj kilka razy do formul "ten kadr", "to zdjecie", "opis zdjecia", "miniatura", "podpis pod obrazem". Po zakotwiczeniu sceny dalszy tekst ma byc opowiescia o miejscu. Sluchacz nie stoi przed instrukcja pisania opisu, tylko przed zamkiem, mostem, rynkiem, klasztorem, skala, wodospadem albo sala muzealna.

Najlepsze zakotwiczenie nie brzmi "kadr jako punkt wejscia", tylko nazywa element, ktory naprawde widac. Jesli na zdjeciu Ratusza widac pregierz, zacznij od pregierza i jego historii. Jesli widac portal, wieze, herb, most, pomnik, dziedziniec albo mur, zacznij od niego. Rozpoznany detal ma otworzyc opowiesc, a nie byc dekoracja pierwszego zdania.

Dobra struktura dlugiego opisu:

1. Pierwsze zdanie zakotwicza miejsce albo obiekt widoczny na zdjeciu.
2. Pierwszy akapit otwiera scene tak, jak przewodnik stojacy obok: "jestesmy przy bramie", "stoimy na dziedzincu", "pod nami plynie Odra", "po lewej widac wieze".
3. Drugi akapit odpowiada, dlaczego to miejsce powstalo wlasnie tutaj: rzeka, trakt, wzgorze, granica, rynek, klasztor, dawny zbiornik, kopalnia, uzdrowisko, punkt widokowy.
4. Kolejne akapity rozwijaja pewne fakty: epoke, wlascicieli, funkcje, przebudowe, wydarzenie albo konflikt.
5. Jesli miejsce ma legende, podaj ja jako legende, osobno od faktow, z konkretnym imieniem, miejscem albo motywem.
6. Jesli pasuje lekki humor, oprzyj go na lokalnym kontrascie, widocznym detalu, dwuznacznym napisie albo anegdocie, nie na zmyslaniu.
7. Ostatni akapit zostawia konkretna wskazowke wizyty: co zobaczyc, gdzie spojrzec, ktory element porownac, jak przejsc kilka krokow, zeby historia stala sie widoczna.

Dobre otwarcia sa konkretne:

- "Stoimy przy Zamku Ksiaz, nad wawozem Pelcznicy. To polozenie nie bylo przypadkiem..."
- "Na dziedzincu zamku w Olesnicy najlepiej widac, jak dawna warownia Piastow zmieniala sie w rezydencje Podiebradow..."
- "Przy Moscie Tumskim warto zaczac od stali z 1889 roku i od tego, ile ton klodek trzeba bylo pozniej zdjac z zabytku..."
- "W Hydropolis nie zaczynamy od multimedialnej ekspozycji, tylko od dawnego zbiornika wody czystej przy Na Grobli..."

Awaryjne otwarcia typu "to zdjecie pokazuje..." sa dopuszczalne tylko wtedy, gdy generator naprawde rozpoznal konkretny element i w tym samym zdaniu przechodzi do jego historii. Nie uzywaj ich jako domyslnej formuly, bo latwo produkuja mdly, powtarzalny poczatek.

## Warianty Stylu Do Dalszej Pracy

Te warianty sa punktami startu do pozniejszego strojenia:

- `historyczna ciekawostka`: domyslny wariant; jedna konkretna historia, fakt albo przemiana miejsca.
- `legenda i opowiesc`: dla zamkow, gor, podziemi, skal i miejsc z mocnym folklorem; wyraznie oddzielaj legende od faktu.
- `zabawna anegdota`: lekki ton, gdy miejsce ma absurdalny detal, nietypowa funkcje albo lokalny paradoks.
- `wydarzeniowa scena`: opis oparty na konkretnym wydarzeniu, wizycie, przebudowie, konflikcie albo zmianie wlasciciela.
- `edutainment`: najmocniejszy wariant domyslny; fakt historyczny podany jak miniopowiesc z haczykiem i puenta.
- `dolnoslaska warstwa`: pokazuje zmiany granic, funkcji, wlascicieli i epok bez suchego wykladu.
- `dlugi trop`: spokojniejszy wariant dla prostych detali; nadal ma miec minimum kilka akapitow i zrodlowe tlo miejsca.
- `cover`: najmocniejsza historia wejscia, bo zdjecie buduje pierwsze wrazenie miejsca na mapie.

Kazdy wariant nadal musi trzymac sie tych samych blokow i tego samego kontraktu aplikacji.

## Research Przed Pisaniem

Ten sposob pisania i szukania informacji dotyczy wszystkich zdjec PhotoMap, nie tylko jednego miasta albo jednego miejsca. Przed generowaniem opisow dla serii zdjec zawsze wykonaj research online dla danego `place`.

- zacznij od oficjalnych stron miejsca, miasta, muzeum, instytucji kultury albo zarzadcy obiektu,
- dynamicznie sprawdz, czy istnieja przewodniki dla tego miejsca: audio guide, transkrypty, PDF-y, spacerowniki, trasy miejskie, mapy zwiedzania, materialy edukacyjne, aplikacje przewodnikowe albo opisy sal i punktow trasy,
- z przewodnikow wyciagaj motywy, kolejnosc zwiedzania, punkty obserwacyjne, perspektywy i kontrasty, ale nie kopiuj gotowego tekstu,
- sprawdz przynajmniej dwa niezalezne zrodla, gdy opis ma zawierac konkretna date, osobe, wydarzenie albo legende,
- dla legend i anegdot szukaj stron, ktore wprost nazywaja je legendami, tajemnicami albo opowiesciami; w opisie nie przedstawiaj ich jako faktu,
- zbierz fakty historyczne, wydarzenia, dawnych wlascicieli, przebudowy, funkcje budynku, watki wojenne, powojenne przemiany, lokalne konflikty i nietypowe detale,
- ustal konkretna lokalizacje sensu: rzeka, wzgorze, trakt, brama miejska, rynek, granica ksiestwa, dawne przejscie, linia kolejowa, zbiornik, uzdrowiskowe zrodlo, kopalnia, klasztor albo inny powod, dla ktorego miejsce powstalo wlasnie tutaj,
- dla zamkow i palacow ustal: kto byl fundatorem albo waznym wlascicielem, co kontrolowal obiekt, jakie mial przebudowy i jaka konkretna czesc jest widoczna albo sensowna dla zdjecia,
- dla mostow i kolei ustal: jakie brzegi, doliny, miasta albo linie laczyly, kiedy powstaly i co bylo technicznie ciekawe,
- dla miejsc sakralnych ustal: fundacje, zakon, wyznanie, konflikty, wezwanie, relikwie, pielgrzymki albo konkretne elementy wnetrza,
- dla gor, skal i wodospadow ustal: nazwe pasma, proces geologiczny, lokalna legende, szlak, punkt widokowy albo trudnosc dojscia,
- dla muzeow i ekspozycji ustal: poprzednia funkcje budynku, najwazniejsza kolekcje, konkretna sale albo obiekt, a nie tylko temat muzeum,
- wybierz material pasujacy do zdjecia: szeroki widok lub cover moze niesc historie calego miejsca, detal moze niesc jedna postac, epoke, legende albo zabawny kontrast,
- nie opisuj w `description_blocks` samych zrodel, autorow, licencji ani procesu researchu; zrodla sluza do wiarygodnosci tekstu,
- jesli zrodla sa sprzeczne, wybierz wersje ostrozna albo nazwij ja jako "wedlug legendy", "wedlug lokalnych opowiesci", "wedlug tradycji" zamiast stawiac teze jako pewnik,
- nie uzywaj niezweryfikowanych informacji o cenach, godzinach otwarcia, aktualnych zasadach wejscia ani wydarzeniach sezonowych, chyba ze opis ma byc natychmiast aktualizowany.

Przed pisaniem przygotuj krotka notatke robocza dla miejsca:

```txt
Miejsce:
Znalezione przewodniki albo brak przewodnika:
Najciekawsze motywy z przewodnikow:
Najlepsze zrodla i poziom pewnosci:
Sprzecznosci albo luki w zrodlach:
Dlaczego tutaj:
3 pewne fakty:
1 lokalna historia albo legenda:
2 sceny albo przyklady z realnego zycia:
1 detal widoczny lub sensowny dla zdjecia:
Glowny watek tego zdjecia:
Watek, ktorego nie wolno powtorzyc z innych zdjec:
Temat interpretacyjny:
IPOP:
Instrukcja terenowa:
Obecne kontra nieobecne:
Wieloglos:
Perspektywy pomijane:
Obietnica dla sluchacza po pierwszych 20 sekundach:
Mysl albo wspomnienie, ktore ma zostac po odsluchu:
Czego nie mowic, bo nie zostalo zweryfikowane:
```

Jesli nie da sie wypelnic pola "Dlaczego tutaj" albo "3 pewne fakty", nie generuj opisu na podstawie ogolnego wzorca. Najpierw szukaj dalej albo napisz krotszy, uczciwy opis bez udawania konkretu.

## Dane Potrzebne Przed Generowaniem

Przed wygenerowaniem opisow dla serii zdjec zbierz:

- `place.title`,
- krotki opis miejsca,
- lokalny komentarz redakcyjny, jesli istnieje,
- kategorie miejsca,
- pewne fakty historyczne albo zrodlo, z ktorego wolno korzystac,
- znane legendy i anegdoty, jesli sa oznaczone jako legendy,
- 2-4 linki zrodlowe uzyte do sprawdzenia historii, legend albo wydarzen,
- ocene wiarygodnosci zrodel: oficjalne, przewodnikowe, naukowe/regionalne, lokalne albo tylko pomocnicze,
- luki i sprzecznosci w zrodlach, ktorych nie wolno zamienic w pewniki,
- linki do znalezionych przewodnikow miejsca albo jawna notatke, ze nie znaleziono dostepnego przewodnika,
- najciekawsze motywy z przewodnikow: punkty trasy, wskazowki patrzenia, historie ludzi, kontrasty i nieoczywiste detale,
- odpowiedz "dlaczego to miejsce jest tutaj", z nazwami rzek, wzgorz, ulic, dawnych traktow, granic albo funkcji,
- 3-6 konkretnych faktow na miejsce, ktore wolno potem mieszac miedzy zdjeciami z tej samej galerii bez powtarzania tego samego szablonu,
- 2-4 sceny albo przyklady z realnego zycia zwiazane z miejscem: mieszkaniec, podrozny, kupiec, mnich, ksiezna, robotnik, straznik, uczen, turysta, rzemieslnik, urzednik albo rodzina,
- mysl, kontrast albo wspomnienie, ktore opis ma zostawic po odsluchu,
- temat interpretacyjny dla kazdego zdjecia, napisany jako zdanie laczace widoczny detal z sensem miejsca,
- wejscie IPOP dla kazdego zdjecia: `Ideas`, `People`, `Objects` albo `Physical`,
- instrukcje terenowe dla zdjec: gdzie spojrzec, gdzie stanac, co porownac, co obejsc albo co zobaczyc jako brakujacy slad,
- warstwe "obecne kontra nieobecne": co widac dzis i czego juz nie widac, ale co jest wazne dla historii,
- mozliwe glosy opowiesci i perspektywy pomijane,
- obietnice pierwszych 20 sekund dla kazdego zdjecia,
- informacje, ktore zdjecie jest coverem,
- nazwe albo roboczy tytul zdjecia, jesli pomaga rozpoznac scene,
- miniatury albo podglad kazdego zdjecia,
- role zdjec w galerii: glowny obiekt, detal z historia, wnetrze, widok, tablica, pomnik, wejscie, okolica,
- mape unikalnych watkow dla zdjec tego samego miejsca, zeby nie powtarzac tej samej historii, legendy, anegdoty ani tego samego zestawu faktow,
- ewentualne ograniczenia tonu dla miejsca pamieci, sacrum albo trudnego tematu.

Jesli nie ma pewnosci co do faktu, nie dopowiadaj go. Lepiej napisac krotszy opis na podstawie pewnych informacji niz atrakcyjna, ale falszywa historie. Przy miejscach pamieci, sacrum i trudnej historii unikaj humoru oraz sensacyjnego tonu.

## Reaudyt Gotowego Opisu

Po napisaniu opisu zrob bezlitosny reaudyt, zanim zapiszesz wynik:

1. Test zamiany nazwy: jesli po podmianie nazwy miejsca tekst nadal prawie dziala, opis jest zbyt ogolny.
2. Test pierwszych 20 sekund: po pierwszym akapicie sluchacz ma wiedziec, gdzie jest, co ma zobaczyc i dlaczego to jest ciekawe.
3. Test przewodnika w terenie: minimum raz tekst ma powiedziec, gdzie spojrzec, co porownac albo jaki brakujacy slad sobie wyobrazic.
4. Test faktow: kazda data, osoba, nazwa, funkcja i legenda musi miec zrodlo albo byc oznaczona jako niepewna/opowiesciowa.
5. Test sceny ludzkiej: tekst musi zawierac przynajmniej jedna scene z czlowiekiem lub grupa ludzi, nie tylko architekture.
6. Test antyduplikacji: porownaj z innymi opisami tego samego `place`; tytul, glowny watek, puenta i legenda nie moga sie powtarzac.
7. Test glosu: przeczytaj tekst na glos. Jesli zdanie wymaga powrotu wzrokiem, skroc je albo rozbij.
8. Test uczciwosci: usun zdania, ktore brzmia ladnie, ale nie niosa nowej informacji, obrazu, pytania, kontrastu albo emocjonalnej konsekwencji.

Nie poprawiaj slabego opisu przez samo wydluzanie. Najpierw dodaj brakujacy fakt, scene, detal, konflikt, osobe albo lokalny trop. Dlugi pusty opis jest gorszy niz krotki uczciwy szkic, bo zuzywa cierpliwosc uzytkownika.

## Checklist Przed Zapisem

- `caption` jest krotki i nie powtarza calych zdan z opisu.
- `description_blocks` nie sa puste, jesli zdjecie ma miec TTS.
- Kazdy blok ma niepusty `text`.
- Tekst czyta sie naturalnie na glos.
- Dlugosc wynika z roli zdjecia i jakosci materialu: cover albo najmocniejsze ujecie zwykle ma 1000+ slow, standardowe zdjecie z osobnym watkiem zwykle 650-1000+ slow, a prosty detal albo ujecie pomocnicze moze byc krotsze, jesli jest konkretne i nie dubluje innych opisow.
- Nie ma gornego limitu slow: jesli opis jest konkretny, ciekawy, dobrze udokumentowany i dobrze brzmi w TTS, moze byc dluzszy.
- Opis nie zostal wydluzony tylko po to, zeby dobic do liczby slow; kazdy dodatkowy blok wnosi nowy fakt, scene, osobe, kontrast, legende, brakujacy slad, instrukcje terenowa albo puentę.
- Krotki opis nie jest tylko rozpoczeciem historii bez rozwiniecia: ma pelny luk narracyjny albo jawnie wynika z ubogiego, uczciwie sprawdzonego materialu.
- Pierwszy segment, czyli `heading` i pierwsze 2-3 bloki, dziala samodzielnie i daje uzytkownikowi wartosc nawet wtedy, gdy przerwie sluchanie.
- Przed opisem sprawdzono zrodla online dla danego miejsca, a legendy nie sa pomylone z faktami.
- Najwazniejsze fakty maja przypisana wiarygodnosc zrodel; luki i sprzecznosci nie zostaly zamienione w pewniki.
- Przed opisem sprawdzono, czy istnieja przewodniki, audio guide, transkrypty, PDF-y, spacerowniki albo oficjalne trasy dla miejsca; jesli istnieja, opis wykorzystuje ich najlepsze tropy wlasnymi slowami.
- Nie ma kopiowania cudzych przewodnikow ani dlugich cytatow; z materialow zewnetrznych przejeto tylko fakty, motywy, punkty obserwacyjne, kolejnosc patrzenia i kontrasty.
- Opis odpowiada konkretnie, dlaczego miejsce powstalo albo stalo sie wazne wlasnie tutaj.
- Kazda ogolna teza ma lokalny przyklad w tym samym albo nastepnym zdaniu.
- Opis przechodzi test zamiany nazwy: po podstawieniu innego miejsca przestaje dzialac albo brzmi ewidentnie falszywie.
- Opis przechodzi test pierwszych 20 sekund: od razu wiadomo, gdzie jestesmy, co widzimy i dlaczego warto sluchac.
- Opis przechodzi test czytania na glos: nie ma zdan, ktore wymagaja cofniecia sie wzrokiem albo pamietania zbyt wielu nazw naraz.
- Opis ma jednozdaniowy temat interpretacyjny, nawet jesli nie jest widoczny jako osobny blok.
- Opis ma jasne wejscie IPOP: idee, ludzie, obiekty albo doswiadczenie fizyczne; w galerii jednego miejsca wejscia IPOP nie sa monotonne.
- Opis zawiera instrukcje terenowa albo obserwacyjna: gdzie spojrzec, co porownac, gdzie stanac albo jaki brakujacy slad sobie wyobrazic.
- Opis wykorzystuje warstwe "obecne kontra nieobecne", jesli miejsce ma ruiny, odbudowy, znikniete budynki, dawne funkcje albo zmieniony krajobraz.
- Opis ma przynajmniej jeden wieloglosowy trop: perspektywe dokumentu, kuratora, mieszkanca, pracownika, swiadka, kronikarza, legendy albo grupy spolecznej.
- Opis sprawdza perspektywy pomijane: nie opiera sie wylacznie na wladcach, fundatorach i architektach, jesli miejsce daje material na zwyklych ludzi.
- Pierwsze 2-3 bloki tworza mocny rdzen opowiesci; dalsze bloki sa poglebieniem, a nie powtorzeniem wstepu.
- Opis zostawia miejsce na reakcje uzytkownika: nie mowi mu wprost, co ma czuc.
- Tekst zawiera minimum trzy nazwy/fakty szczegolowe: osoba, data, rzeka, wzgorze, ulica, rod, zakon, sala, przebudowa, wydarzenie, legenda albo funkcja.
- Tekst zawiera minimum dwie sceny albo przyklady z realnego zycia, a nie tylko opis architektury i liste faktow.
- Jesli pojawia sie konkretna postac, jej historia ma konsekwencje, obraz miejsca i mysl, ktora zostaje po odsluchu.
- Nie ma pustych fraz meta typu "kadr jest punktem wejscia", "ten opis dziala", "zdjecie zakotwicza wzrok", "wlasny rytm", "mala brama do miejsca".
- Jesli tekst mowi, ze cos przykuwa wzrok albo prowadzi opowiesc, podmiotem jest konkretny element widoczny na zdjeciu i od razu pojawia sie jego historia.
- Nie ma pustych list mozliwosci typu "legendy, przemyslowe slady albo miejskie rytualy" bez natychmiastowego przykladu.
- Opis nie dubluje glownego watku, legendy, anegdoty, tytulu ani ukladu faktow z innych zdjec tego samego miejsca.
- Jesli opis uzywa faktu wspolnego dla miejsca, robi to tylko jako krotki kontekst i wnosi nowy szczegol zwiazany z konkretnym zdjeciem.
- Opis nie konkuruje z pelnym opisem miejsca.
- Opis moze krotko nazwac scene ze zdjecia najwyzej raz na poczatku, ale potem opowiada o miejscu.
- Ciekawostka historyczna jest pewna albo jasno opisana jako legenda.
- Tekst ma element rozrywkowy: haczyk, ciekawostke, kontrast, lekki humor albo puenta.
- Jesli humor wynika z dwuznacznosci, napisu, monogramu albo lokalnej nazwy, jest krotki, taktowny i wraca do historii miejsca.
- Puenta zostawia konkretna mysl, moral, obraz albo wspomnienie, ktore moze wrocic uzytkownikowi, gdy stanie przy miejscu.
- Opis nie zawiera prywatnych sciezek, danych technicznych pliku ani atrybucji.
- Opis nie obiecuje funkcji, tras, cen ani warunkow, ktorych aplikacja nie potwierdza.
- Ton pasuje do miejsca: lekki przy anegdocie, spokojny przy historii trudnej, bardziej zapraszajacy przy coverze.

## Prompt Roboczy

Uzywaj tego polecenia jako startu przy generowaniu serii:

```txt
Dla kazdego zdjecia PhotoMap wygeneruj `caption` i `description_blocks`.
Opis ma byc przypiety do konkretnego zdjecia, pisany po polsku, gotowy do overlayu i TTS.
Przed pisaniem wyszukaj online wiarygodne zrodla o danym miejscu: oficjalne strony, strony miasta, muzeum, instytucje kultury, dobre opracowania lokalne. Ten research dotyczy wszystkich zdjec, nie tylko jednego miejsca.
Zastosuj zasade GIGO: nie zaczynaj pisania, dopoki nie masz rozpoznanego miejsca i zdjecia, glownego watku zdjecia, odpowiedzi "dlaczego tutaj", minimum trzech pewnych faktow, rozdzielenia faktow od legend, jednego konkretnego detalu oraz decyzji tonu.
Dynamicznie sprawdz, czy istnieja gotowe przewodniki dla danego miejsca: audio guide, transkrypty, PDF-y, spacerowniki, trasy miejskie, mapy zwiedzania, materialy edukacyjne, aplikacje przewodnikowe albo opisy sal i punktow trasy. Jesli istnieja, przeanalizuj je i wyciagnij najciekawsze motywy, punkty obserwacyjne, kolejnosc zwiedzania, glosy, kontrasty i detale. Nie kopiuj tekstu przewodnika; wplataj tylko wlasnymi slowami fakty, tropy i strukture patrzenia.
Uzyj hierarchii zrodel: oficjalne i przewodnikowe wyzej niz blogi, publikacje regionalne wyzej niz agregatory SEO. Agregatory turystyczne moga dac trop, ale nie moga byc jedynym zrodlem konkretnego faktu.
Przed pisaniem przygotuj notatke: znalezione przewodniki albo brak przewodnika, najlepsze zrodla i poziom pewnosci, sprzecznosci albo luki, najciekawsze motywy z przewodnikow, dlaczego miejsce powstalo tutaj, 3 pewne fakty, 1 lokalna historia albo legenda, 2 sceny albo przyklady z realnego zycia, 1 detal widoczny lub sensowny dla zdjecia, glowny watek zdjecia, watek zakazany do powtorzenia, temat interpretacyjny, IPOP, instrukcja terenowa, obecne kontra nieobecne, wieloglos, perspektywy pomijane, obietnica pierwszych 20 sekund, mysl albo wspomnienie, ktore ma zostac po odsluchu.
Jesli generujesz kilka opisow dla tego samego miejsca, najpierw przygotuj mape unikalnych watkow dla calej galerii. Kazde zdjecie ma dostac inny glowny temat, inny caption i inny zestaw szczegolow. Nie powtarzaj tej samej legendy, anegdoty ani historii w kolejnych zdjeciach, chyba ze nowe zdjecie pokazuje inny konkretny element tej historii.
Polacz rozpoznanie zdjecia z nazwa zdjecia albo nazwa miejsca tylko po to, zeby krotko zakotwiczyc scene, najlepiej jednym zdaniem.
Nie analizuj kompozycji fotografii i nie komentuj samego opisu. Po pierwszym zdaniu opowiadaj jak przewodnik stojacy w miejscu zrobienia zdjecia.
Wybierz jeden glowny watek i rozwin go przez kilka zrodlowych detali: konkretne daty, osoby, rzeki, wzgorza, trakty, granice, przebudowy, funkcje, legendy albo lokalne anegdoty. Dodaj warstwe ludzka: minimum dwie sceny z zycia, konsekwencje dla konkretnej osoby albo grupy i moment puenty, ktory zostawia mysl po odsluchu. Koloryzuj narracyjnie tylko to, co wynika ze zrodel albo realnego kontekstu; nie wymyslaj faktow, dialogow ani emocji jako pewnika.
Zastosuj standard interpretacyjny: temat interpretacyjny w jednym zdaniu, IPOP, instrukcja terenowa, obecne kontra nieobecne, wieloglos, perspektywy pomijane, warstwowy opis i miejsce na reakcje uzytkownika.
Pierwszy segment, czyli `heading` i pierwsze 2-3 bloki, ma dzialac samodzielnie: od razu wiadomo, gdzie jestesmy, co widzimy, dlaczego to wazne i dlaczego warto sluchac dalej. Dalsze segmenty maja dokladac nowe watki, a nie powtarzac wstep.
Kazda ogolna teza musi miec natychmiastowy lokalny przyklad. Nie pisz "zamki zwykle", "w takich miejscach", "kadr jest punktem wejscia", "zdjecie zakotwicza wzrok", "wlasny rytm" ani podobnych fraz jako pustego meta-komentarza. Jesli chcesz zakotwiczyc opowiesc w obrazie, nazwij konkretny widoczny element, np. pregierz, wieze, portal, brame, mur, arkade, pylon albo dziedziniec, i natychmiast opowiedz jego lokalna historie.
Nie wymyslaj faktow spoza danych i zrodel, nie mieszaj legendy z pewna historia i nie powtarzaj atrybucji.
Przed zwroceniem wyniku zrob reaudyt: test zamiany nazwy miejsca, test pierwszych 20 sekund, test przewodnika w terenie, test faktow, test sceny ludzkiej, test antyduplikacji i test czytania na glos.
Zwroc wynik w strukturze JSON zgodnej z polami `caption` oraz `description_blocks`.
Styl: edutainment turystyczny, ciekawy, wiarygodny, historyczno-opisowy, czasem wydarzeniowy albo zabawny, lekki w odbiorze, bez gornego limitu slow i bez jednego sztywnego minimum dla wszystkich zdjec. Dlugosc ma wynikac z roli zdjecia, bogactwa zrodel i unikalnosci watku: cover albo najmocniejsze ujecie zwykle 1000+ slow, standardowe zdjecie z osobnym watkiem zwykle 650-1000+ slow, prosty detal albo ujecie pomocnicze moze byc krotsze, jesli ma pelny luk narracyjny i nie dubluje innych opisow. Nie wydluzaj tekstu pod licznik; kazdy dodatkowy blok musi wniesc nowa wartosc.
```
