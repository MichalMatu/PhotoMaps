# Ops

Ten dokument opisuje lokalne czynności operacyjne PhotoMap: diagnostykę danych, backup i podstawowy restore test. Nie jest roadmapą produktu.

## API Request IDs

Każda odpowiedź backendu ma nagłówek `X-Request-ID`. Jeśli klient przyśle własny poprawny identyfikator, backend go zachowa; w przeciwnym razie wygeneruje nowy. Odpowiedzi błędów JSON mają kształt:

```json
{
  "detail": "Human readable error",
  "request_id": "request-id"
}
```

Błędy walidacji zachowują listę FastAPI w `detail`, ale również dodają `request_id`. Nieobsłużone wyjątki zwracają bezpieczne `Internal server error` bez szczegółów implementacji.

## Limity Kolejek Admina

Listy moderacji w admin API mają limit wyników:

- `GET /api/admin/photos?limit=100`,
- `GET /api/admin/memories?limit=100`,
- `GET /api/admin/reports?limit=100`.

Domyślny limit to `100`, a maksymalny dozwolony limit to `200`. Parametr `status` można łączyć z `limit`, np. `GET /api/admin/photos?limit=50&status=pending`.

Te endpointy są kolejkami pracy, a nie źródłem pełnych galerii miejsc. Panel zdjęć konkretnego miejsca używa `GET /api/admin/places/{place_id}/photos`, żeby pobrać wszystkie zdjęcia tego miejsca niezależnie od paginacji i aktualnego filtra kolejki moderacji.

Pełne liczniki badge'y moderacji nie pochodzą z paginowanych list. Admin UI używa `GET /api/admin/moderation/counts`, które zwraca pełne totals z bazy dla zdjęć, pamiątek i zgłoszeń z rozbiciem po statusach. Dzięki temu badge `Zdjęcia`, `Wszystkie`, `Zatwierdzone` itd. nie zatrzymuje się na wartości `100`, gdy pierwsza strona kolejki ma domyślny limit.

## Limity Publicznych Uploadów

Publiczne uploady pamiątek są blokowane, jeśli kolejka materiałów `pending` przekracza limit rekordów albo limit bajtów w storage. Do limitu bajtów wlicza się obraz, miniatura, publiczna kopia i opcjonalne audio. Zdjęcia miejsc są dodawane przez adminowy upload redakcyjny i nie podlegają tym limitom.

Konfiguracja env:

```bash
PHOTOMAP_PUBLIC_PENDING_MEDIA_MAX_RECORDS=100
PHOTOMAP_PUBLIC_PENDING_MEDIA_MAX_BYTES=536870912
PHOTOMAP_PUBLIC_MEMORY_UPLOAD_RATE_LIMIT=10
PHOTOMAP_PUBLIC_MEMORY_UPLOAD_RATE_WINDOW_SECONDS=3600
PHOTOMAP_PUBLIC_MEMORY_UPLOAD_MAX_CONCURRENCY=1
PHOTOMAP_ADMIN_MEDIA_UPLOAD_MAX_CONCURRENCY=1
PHOTOMAP_PUBLIC_REPORT_RATE_LIMIT=20
PHOTOMAP_PUBLIC_REPORT_RATE_WINDOW_SECONDS=3600
PHOTOMAP_PUBLIC_MEMORY_OWNER_RATE_LIMIT=30
PHOTOMAP_PUBLIC_MEMORY_OWNER_RATE_WINDOW_SECONDS=3600
PHOTOMAP_TRUSTED_PROXY_NETWORKS=127.0.0.1/32,::1/128
```

Limity częstotliwości są prowadzone w pamięci procesu osobno dla uploadów pamiątek i zgłoszeń.
Identyfikator `CF-Connecting-IP` jest używany wyłącznie wtedy, gdy bezpośrednie połączenie pochodzi
z sieci wskazanej w `PHOTOMAP_TRUSTED_PROXY_NETWORKS`; nagłówek od innego klienta jest ignorowany.
Publiczny runtime za lokalnym `cloudflared` powinien pozostać dostępny tylko na loopback.
Limit całego requestu jest sprawdzany przed parserem multipart zarówno z `Content-Length`, jak i podczas
strumieniowego odbierania body, więc upload bez tego nagłówka nie może ominąć ograniczenia rozmiaru.
Domyślnie tylko jeden publiczny upload pamiątki może być jednocześnie parsowany i przetwarzany; następne
żądanie dostaje `429` z `Retry-After`, co ogranicza szczytowe zużycie RAM podczas dekodowania dużych zdjęć.
Mutacje admina sprawdzają Bearer token przed odczytem body. Wszystkie mają limit całego requestu, a trzy
endpointy mediów współdzielą osobny limit jednej równoległej operacji, więc nieuwierzytelniony request nie
może wymusić wcześniejszego spoolowania dużego multipart do `/tmp`.

Publiczny runtime powinien dodatkowo ustawić:

```bash
PHOTOMAP_ENV=production
PHOTOMAP_PUBLIC_SITE_URL=https://photomap.pl
PHOTOMAP_ALLOWED_HOSTS=photomap.pl,www.photomap.pl,localhost,127.0.0.1
FRONTEND_ORIGINS=https://photomap.pl,https://www.photomap.pl
```

Tryb `production` wyłącza `/docs`, `/redoc` i `/openapi.json`. Aplikacja odrzuca nieznane nagłówki
`Host`, dodaje CSP, ochronę przed osadzaniem, `nosniff`, polityki referrera/uprawnień oraz HSTS dla
żądań HTTPS. `/admin` i `/api/admin/*` mają `Cache-Control: no-store`. Token panelu admina jest trzymany
wyłącznie w pamięci bieżącej karty i po odświeżeniu trzeba wpisać go ponownie.

## Diagnostyka Danych

Diagnostyka porównuje SQLite z lokalnym storage:

- `backend/data/app.db`,
- `backend/storage/private`,
- `backend/storage/public`.

Sprawdzane są rekordy `photo` i `memory`, brakujące oryginały prywatne, brakujące publiczne kopie i miniatury, osierocone pliki storage, statusy, liczniki miejsc, cover miejsca oraz publiczne serializery pod kątem prywatnych pól.

Audio jest opcjonalnym załącznikiem do `photo` albo `memory`. Oryginał trafia do prywatnego storage, publiczna kopia trafia pod `/media/...`, a publiczne payloady zwracają tylko obiekt `audio` z `public_path`, `mime_type`, `size_bytes` i `duration_seconds`. Publiczne listy, mapa i szczegóły pokazują audio tylko dla zatwierdzonych mediów; admin widzi metadane audio także w kolejce moderacji. Admin może dodać, podmienić albo usunąć audio dla istniejącego zdjęcia lub pamiątki; podmiana i usunięcie kasują stare pliki audio z private i public storage po udanym zapisie rekordu.

`photo.caption` pozostaje krótkim podpisem zdjęcia. `photo.description_blocks` jest opcjonalnym dłuższym opisem redakcyjnym/narracją przygotowaną pod tekst na ekranie i TTS; nie jest plikiem audio i nie zastępuje atrybucji źródła. Zasady stylu, struktury bloków i edutainment dla opisów zdjęć są w [`docs/create_tts.md`](create_tts.md).

TTS dla opisów zdjęć, miejsc i tras korzysta w przeglądarce z Web Speech API (`speechSynthesis`), a nie z backendowego generatora audio. Na Debianie/Raspberry Pi Brave lub Chromium mogą wystawiać API bez żadnych głosów, co daje niemą ikonę albo brak przycisku po poprawnej detekcji. Runtime powinien mieć lokalny silnik głosu:

```bash
sudo apt install speech-dispatcher espeak-ng
```

Po instalacji zrestartuj Brave/Chromium i sprawdź, czy `window.speechSynthesis.getVoices()` zwraca co najmniej jeden głos. Aplikacja renderuje przycisk TTS tylko wtedy, gdy przeglądarka ma realnie dostępny głos.

```bash
python3 scripts/diagnose_local_data.py
python3 scripts/diagnose_local_data.py --json
python3 scripts/diagnose_local_data.py --output-json .dev/local-data-diagnostics.json
python3 scripts/diagnose_local_data.py --no-image-check
python3 scripts/diagnose_local_data.py --strict
```

Kody wyjścia:

- `0` oznacza brak błędów,
- `1` oznacza błędy,
- `--strict` zwraca `1` także przy ostrzeżeniach.

## Czyszczenie Osieroconych Mediów

Osierocone pliki storage usuwaj dopiero po backupie lokalnych danych. Skrypt korzysta z tej samej diagnostyki co `scripts/diagnose_local_data.py` i usuwa wyłącznie pliki zgłoszone jako `orphan_private_file` albo `orphan_public_file`. Jeśli diagnostyka wykryje błędy, tryb `--apply` nie usuwa plików.

```bash
./scripts/backup_local_data.sh --apply
python3 scripts/cleanup_orphan_media.py --dry-run
python3 scripts/cleanup_orphan_media.py --apply
python3 scripts/cleanup_orphan_media.py --apply --output-json .dev/orphan-media-cleanup.json
```

## Wycofanie Publicznych Mediów Niezatwierdzonych Zdjęć

Po migracji prywatności zdjęć usuń historyczne publiczne pochodne rekordów `pending` i `rejected`. Komenda bez `--apply` jest bezpiecznym dry-runem. Tryb `--apply` usuwa wyłącznie publiczną kopię, miniaturę i publiczne audio, a następnie zeruje ich ścieżki w bazie; prywatny oryginał pozostaje do podglądu moderatora. Skrypt jest idempotentny.

```bash
./scripts/backup_local_data.sh --apply
backend/.venv/bin/python scripts/unpublish_nonapproved_photos.py
backend/.venv/bin/python scripts/unpublish_nonapproved_photos.py --apply
```

W bieżącym przepływie odrzucenie najpierw przenosi publiczne pliki przez atomowy rename do prywatnego quarantine, a następnie jednym commitem zapisuje status `rejected` i puste ścieżki publiczne. Publiczny `server.py` po migracjach automatycznie odzyskuje niedokończoną operację: przy nadal zatwierdzonym rekordzie przywraca pliki, a po zapisanym odrzuceniu usuwa quarantine. Niepusty quarantine bez poprawnego manifestu zatrzymuje start fail-closed i pozostawia prywatne pliki do ręcznej inspekcji.

Po `--apply` unieważnij w cache CDN ścieżki `/media/...` wypisane przez raport, żeby wcześniej zbuforowana odpowiedź nie pozostała dostępna na brzegu.
Runtime ustawia dla `/media/*` rewalidację przeglądarki i `no-store` dla CDN, aby zwykłe odrzucenie
zdjęcia nie pozostawiało publicznej kopii na brzegu. Po pierwszym wdrożeniu tej polityki wykonaj jeden
pełny purge istniejącego cache strefy Cloudflare; nowe nagłówki nie usuwają odpowiedzi zbuforowanych wcześniej.

## Retencja Prywatnych Oryginałów

Retencja prywatnych oryginałów działa jako ręczny skrypt operacyjny. Dla zatwierdzonych mediów po zadanym czasie prywatny oryginał jest zastępowany kopią publicznej pochodnej. Odrzucone media nie mają publicznych pochodnych; admin korzysta z chronionego podglądu prywatnego oryginału tylko do czasu usunięcia go przez retencję.

```bash
python3 scripts/retain_private_originals.py --dry-run
python3 scripts/retain_private_originals.py --dry-run --json
python3 scripts/retain_private_originals.py --apply
python3 scripts/retain_private_originals.py --apply --output-json .dev/private-original-retention.json
```

Domyślnie zatwierdzone media są kwalifikowane po `30` dniach od `approved_at`, a odrzucone media od razu. Progi można zmienić:

```bash
python3 scripts/retain_private_originals.py --dry-run --approved-days 60 --rejected-days 7
```

## Ręczna Redakcja Mediów

Adminowe kolejki zdjęć i pamiątek mają akcję `Anonimizuj`. Modal ładuje obraz, pozwala narysować obszar myszką, przesunąć zaznaczenie, złapać rogi, dopasować kształt, obrócić aktywny obszar i zapisać redakcję. Zapis wypala obszary w prywatnym oryginale, publicznej kopii i miniaturze.

CLI zostaje niższopoziomową ścieżką operacyjną. Współrzędne podawane są jako wartości z zakresu `0..1`: prostokąt jako `left,top,right,bottom`, a poligon jako kolejne punkty `x1,y1,x2,y2,x3,y3`.

```bash
python3 scripts/redact_media_image.py --dry-run --kind photo --id <photo-id> --rect 0.1,0.1,0.4,0.3
python3 scripts/redact_media_image.py --apply --kind memory --id <memory-id> --rect 0.2,0.2,0.5,0.5
python3 scripts/redact_media_image.py --apply --kind photo --id <photo-id> --polygon 0.2,0.2,0.8,0.2,0.5,0.7
python3 scripts/redact_media_image.py --apply --kind photo --id <photo-id> --rect 0.1,0.1,0.4,0.3 --output-json .dev/redaction.json
```

Używaj tego do ręcznego ukrycia twarzy, tablic, przypadkowych osób albo prywatnych szczegółów. Skrypt nie zgaduje regionów automatycznie.

## Eksport Research Opisów

Eksport research tworzy tekstowe paczki ZIP z opisami miejsc: opis miejsca, `article_blocks`,
`local_comment`, podpisy i `description_blocks` istniejących zdjęć, czytelny `review.md`,
prompt `PROMPT.md`, `tts-guidelines.md` z aktualnym standardem TTS z `docs/create_tts.md`
i `requested_changes.template.json` do późniejszego zwrotu poprawek tekstowych.
Paczki nie zawierają zdjęć, prywatnych oryginałów ani EXIF.
Prompt wymaga porównania obecnej i proponowanej wersji oraz zwrotu finalnego
`requested_changes.json` z tekstami gotowymi do późniejszego zapisu w bazie. `description_blocks`
są traktowane jako tekst widoczny w aplikacji i materiał do TTS, więc audyt nie powinien
skracać ich mechanicznie do streszczeń. Wynik audytu ma być wklejony bezpośrednio w czacie,
bez linków i plików do pobrania.

```bash
make export-place-research
make export-place-research QUERY="Rynek"
make export-place-research CITY="Wrocław" PLACE="Rynek"
make export-city-research CITY="Wrocław"
make export-all-research ARGS="--yes"
```

Wyszukiwanie miasta i miejsca jest case-insensitive oraz ignoruje polskie znaki. Jeśli jest kilka wyników
albo tylko podobne nazwy, skrypt pokazuje listę wyboru.

Eksport trafia do czytelnej struktury katalogów:

```txt
research-exports/
  miejsca/{place-slug}.zip
  miasta/{city-slug}.zip
  wszystkie/wszystkie.zip
```

Paczka pojedynczego miejsca, np. `miejsca/rynek-wroclaw.zip`, zawiera pliki opisu bez dodatkowych katalogów.
Paczka miasta, np. `miasta/walbrzych.zip`, zawiera jeden wspólny `PROMPT.md` w głównym katalogu ZIP
i osobne katalogi miejsc w środku. Paczka `wszystkie/wszystkie.zip` zawiera katalogi miast, a w nich katalogi miejsc.
Każdy eksport odświeża też `research-exports/prompt.txt` z krótką instrukcją do skopiowania
do czatu razem z załączonym ZIP-em.

`research-exports/` jest ignorowane przez Git. Paczki są lokalnym artefaktem roboczym i nie powinny
trafiać do commita.

## Tryby CLI

Skrypty operacyjne, które tylko raportują stan, obsługują `--json`, `--output-json` i `--strict`. Skrypty, które mogą zmieniać dane albo pliki, obsługują dodatkowo `--dry-run` i `--apply`.

Importer manifestów również działa w tym trybie:

```bash
python3 scripts/content/import_city.py --dry-run content/cities/wroclaw/manifest.json
python3 scripts/content/import_city.py --apply content/cities/wroclaw/manifest.json
```

## Backup Lokalny

Backup lokalny uruchamia diagnostykę przed kopiowaniem danych. Jeśli diagnostyka wykryje błędy, backup jest blokowany, a raport JSON zostaje zapisany w katalogu niedoszłego backupu.

```bash
./scripts/backup_local_data.sh --dry-run
./scripts/backup_local_data.sh --apply
./scripts/backup_local_data.sh --dry-run --json
./scripts/backup_local_data.sh --apply --output-json .dev/backup-report.json
./scripts/backup_local_data.sh --apply --keep-backups 2
./scripts/backup_local_data.sh --apply --no-prune
```

Udany backup trafia do:

```txt
backups/local-{timestamp}
```

Zakres backupu:

- `backend/data/app.db`,
- `backend/storage`,
- `local-data-diagnostics.json`.

Katalog `backups/` jest lokalny i nie powinien trafiać do Git.

Po udanym `--apply` skrypt domyślnie zostawia tylko najnowszy katalog `backups/local-*` i usuwa starsze lokalne backupy. Czyszczenie działa dopiero po poprawnym utworzeniu nowej kopii. Liczbę zachowanych kopii można zmienić przez `--keep-backups N` albo `PHOTOMAP_BACKUP_KEEP=N`; jednorazowo można je wyłączyć przez `--no-prune`.

## Restore Test

Próbne odtworzenie wykonuj do katalogu tymczasowego, bez nadpisywania aktywnego `backend/data` ani `backend/storage`.

```bash
mkdir -p /tmp/photomap-restore-test
cp -R backups/local-{timestamp}/backend /tmp/photomap-restore-test/backend
PHOTOMAP_DATA_DIR=/tmp/photomap-restore-test/backend/data \
PHOTOMAP_STORAGE_DIR=/tmp/photomap-restore-test/backend/storage \
python3 scripts/diagnose_local_data.py
```

Jeśli diagnostyka po restore zwraca błędy, nie używaj tego backupu jako źródła odtworzenia bez ręcznej weryfikacji.

## Raport Architektury

Raport architektury jest narzędziem read-only do szybkiej orientacji w kodzie. Pokazuje największe pliki, najdłuższe funkcje, znalezione stringi endpointów, zależności między grupami modułów, cykle importów Pythona, proste ryzykowne wzorce i dostępność lokalnych narzędzi.

```bash
python3 scripts/diagnose_architecture.py
python3 scripts/diagnose_architecture.py --json
python3 scripts/diagnose_architecture.py --output-json .dev/architecture-diagnostics.json
```

Raport nie modyfikuje danych ani kodu. Traktuj go jako wsparcie przy planowaniu porządkowania modułów, nie jako automatyczną listę zadań produktowych.

## Reset Danych Dev

Reset lokalnej bazy i storage:

```bash
./scripts/reset_dev_data.sh
```

Po resecie uruchom migracje przez backend albo pełny check:

```bash
make start
make check
```

## Logi

Lokalne procesy dev zapisują logi w:

```txt
.dev/backend.log
.dev/frontend.log
```

Podgląd:

```bash
make logs
make logs -f
```
