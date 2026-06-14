# Content

Ten katalog trzyma redakcyjne manifesty danych importowanych do PhotoMap. Wroclaw jest pierwszym miastem startowym i przykladem struktury; ten sam przeplyw moze obsluzyc kolejne miasta pozniej, ale aktualnie sluzy redukcji recznej pracy przy obecnym zakresie.

Panel admina sluzy do recznych korekt, moderacji i pojedynczych zmian. Wieksze partie danych powinny powstawac przez:

1. manifest miasta w `content/cities/{city}/manifest.json`,
2. opcjonalne ikony i miniatury w `assets/place-icons`,
3. backup lokalnej bazy,
4. import skryptem `scripts/content/import_city.py`.

## Zasada

Manifesty sa roboczym zrodlem wiekszych zmian, a nie runtime storage aplikacji. Importer dziala po `city.id`, `place.slug` i `guide.slug`, wiec moze tworzyc miasta, nowe miejsca i aktualizowac istniejace bez masowego klikania rekordow w UI.

Kazdy manifest zawiera obiekt `city`, a miejsca uzywaja `category_ids`, zeby jedno miejsce moglo nalezec do kilku kategorii.

## Przykład

```bash
./scripts/backup_local_data.sh
python3 scripts/content/import_city.py content/cities/wroclaw/manifest.json
```

Jeśli importujesz do lokalnego venv backendu:

```bash
backend/.venv/bin/python scripts/content/import_city.py content/cities/wroclaw/manifest.json
```
