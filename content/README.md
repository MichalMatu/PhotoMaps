# Content

Ten katalog trzyma redakcyjne manifesty danych importowanych do PhotoMap. Wroclaw jest pierwszym miastem startowym i przykladem struktury; ten sam przeplyw moze obsluzyc kolejne miasta pozniej, ale aktualnie sluzy redukcji recznej pracy przy obecnym zakresie.

Panel admina sluzy do recznych korekt, moderacji i pojedynczych zmian. Wieksze partie danych powinny powstawac przez:

1. manifest miasta w `content/cities/{city}/manifest.json`,
2. backup lokalnej bazy,
3. import skryptem `scripts/content/import_city.py`.

Zdjecia redakcyjne nie sa importowane manifestem. Pozyskiwanie legalnych, wysokiej jakosci zdjec, selekcja kadrow, deduplikacja i upload przez adminowy pipeline sa opisane w [`docs/editorial-media-workflow.md`](../docs/editorial-media-workflow.md).

## Zasada

Manifesty sa roboczym zrodlem wiekszych zmian, a nie runtime storage aplikacji. Importer dziala po `city.id`, `place.slug` i `guide.slug`, wiec moze tworzyc miasta, nowe miejsca i aktualizowac istniejace bez masowego klikania rekordow w UI.

Kazdy manifest zawiera obiekt `city`, a miejsca uzywaja `category_ids`, zeby jedno miejsce moglo nalezec do kilku kategorii. Dlugie opisy miejsc zapisuj w `article_blocks`; krotkie `description` i `local_comment` zostaja do kart, list i wstepu.

Przed dopisaniem nowego miejsca sprawdz, czy ten sam obiekt nie istnieje juz w manifiescie albo adminie pod inna nazwa, aliasem, adresem albo bardzo podobnymi wspolrzednymi. Jesli istnieje, aktualizuj istniejacy `place` zamiast tworzyc drugi rekord dla tego samego obiektu.

Trasy/kolekcje w manifiescie moga wskazywac tylko miejsca ze statusem `published`, nawet jesli sama trasa jest jeszcze szkicem. To utrzymuje importer w zgodzie z admin API i publicznym kontraktem mapy.

## Przykład

```bash
./scripts/backup_local_data.sh --apply
python3 scripts/content/import_city.py --dry-run content/cities/wroclaw/manifest.json
python3 scripts/content/import_city.py --apply content/cities/wroclaw/manifest.json
```

Jeśli importujesz do lokalnego venv backendu:

```bash
backend/.venv/bin/python scripts/content/import_city.py --dry-run content/cities/wroclaw/manifest.json
backend/.venv/bin/python scripts/content/import_city.py --apply content/cities/wroclaw/manifest.json
```
