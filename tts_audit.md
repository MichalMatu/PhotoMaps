# Generator Audytu Opisów

Do audytu opisów w web chatie używaj generatora promptów:

```bash
make audit-prompt
make audit-prompt CITY="Wrocław" PLACE="Rynek"
make audit-prompt CITY="Wrocław" ARGS="--scope city --audit tts --fields all"
make audit-prompt CITY="Wrocław" PLACE="Rynek" ARGS="--audit seo --fields place"
```

Generator wybiera tylko aktywne miasta i opublikowane miejsca z lokalnej bazy, a w gotowym promptcie
każe agentowi pobrać dane z publicznego API PhotoMap:

- `https://photomap.pl/llms.txt`
- `https://photomap.pl/api/public/cities/{city_id}/places`
- `https://photomap.pl/api/public/cities/{city_id}/places/{place_slug}`

Domyślnie prompt zapisuje się do:

```txt
research-exports/prompt.txt
```

Tryby audytu:

- `--audit quick` - TTS, język i czytelność dla agentów AI.
- `--audit full` - quick plus SEO i ostrożność faktograficzna.
- `--audit tts` - naturalność lektora, składnia i standard z `docs/create_tts.md`.
- `--audit seo` - SEO bez marketingowego tonu.

Pola:

- `--fields all` - `description`, `article_blocks`, podpisy i opisy zdjęć.
- `--fields place` - tylko opis miejsca i `article_blocks`.
- `--fields photos` - podpisy i opisy zdjęć.
- `--fields tts` - `article_blocks`, podpisy i opisy zdjęć.

Uwagi:

- Przy `--audit tts` albo polach zdjęć generator dodaje skrót standardu TTS PhotoMap.
- `CITY="Wrocław"` bez `PLACE` i bez `--scope` w trybie nieinteraktywnym generuje audyt całego miasta.
- W tabeli zwrotnej `stary tekst` ma być dokładnym fragmentem JSON, bez wielokropków i parafrazy.
