# Content

Ten katalog jest na redakcyjne manifesty danych importowanych do aplikacji.

Panel admina zostaje do ręcznych korekt, ale większe miasta powinny powstawać przez:

1. manifest miasta w `content/cities/{city}/manifest.json`,
2. ikony i miniatury w `assets/place-icons`,
3. backup lokalnej bazy,
4. import skryptem `scripts/content/import_city.py`.

## Zasada

Manifesty są źródłem roboczym, które Codex może edytować i importować powtarzalnie. Importer działa po `city.id` oraz `slug`, więc może tworzyć miasta, nowe miejsca i aktualizować istniejące bez ręcznego klikania rekordów w UI.

Każdy manifest zawiera obiekt `city`, a miejsca używają `category_ids`, żeby jedno miejsce mogło należeć do kilku kategorii.

## Przykład

```bash
./scripts/backup_local_data.sh
python3 scripts/content/import_city.py content/cities/wroclaw/manifest.json
```

Jeśli importujesz do lokalnego venv backendu:

```bash
backend/.venv/bin/python scripts/content/import_city.py content/cities/wroclaw/manifest.json
```
