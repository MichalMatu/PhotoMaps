# AGENTS.md - Public Map

## Purpose

Publiczna mapa jest glownym produktem: wizualna tablica miniaturek miejsc, warstw i szybkich podgladow.

## Ownership

- `PlaceMap.tsx` sklada publiczne doswiadczenie mapy.
- `PlaceMarker.tsx`, `mapHtml.ts` i `mapMarkerScale.ts` trzymaja marker, HTML Leafleta oraz skale zoomu.
- `placePreview.ts` trzyma transformacje danych do lekkiego podgladu.
- Sheets i modale mapy obsluguja akcje uzytkownika przypiete do miejsca.

## Local Contracts

- Pierwszy widok mapy nie moze byc pusty wizualnie; powinien pokazac miniatury miejsc albo klastry miniaturek.
- Publiczne markery sa wizualnymi miniaturami miejsc; klasyczna pinezka nie jest publicznym domyslem.
- `map preview` pozostaje lekkim kontraktem: miejsce, miasto, kategorie, score, liczniki, cover i kilka podgladow.
- Nie pobieraj pelnych galerii ani pelnych pamiatek tylko po to, zeby wyrenderowac pierwszy widok mapy.
- Warstwy mapy sa sposobem ogladania danych; kategorie i filtry maja byc dynamiczne z API.
- Publicznie renderuj tylko opublikowane miejsca oraz zatwierdzone media i pamiatki.
- Klikniecie miniatury wachlarza otwiera bezposrednio jeden modal medium. Nie tworz posredniego viewera, ktory tylko powtarza to samo zdjecie.
- Modal medium pokazuje jeden kompaktowy blok tekstu na obrazie: podpis zdjecia z opisem miejsca albo dane pamiatki. Akcje edycji i zgloszenia pozostaja kompaktowe.
- Najblizszy zakres mapy to Map Experience v1, Galerie, dynamiczne kategorie i stabilizacja preview bez utraty wizualnego pierwszego widoku.

## Work Guidance

- Zmiany gestosci, rozmiaru i priorytetu markerow trzymaj w helperach, z testami jednostkowymi.
- Leaflet-specific HTML i event edge cases trzymaj poza duzym komponentem mapy.
- Sheets mapy maja byc akcjocentryczne: pokazuj tylko dane potrzebne do raportu, pamiatki, zdjecia albo podgladu.
- Po optymalizacji danych sprawdz, czy mapa nadal ma efekt miniatur w pierwszym widoku.

## Verification

- `cd frontend && npm run test -- src/components/map`
- `cd frontend && npm run build`
- `cd frontend && npm run test:e2e` po zmianach markerow, warstw, sheets albo pierwszego widoku mapy.

## Child Index

Brak lokalnych child docs.
