# PhotoMap

PhotoMap to wizualna mapa miejsc z klimatem. Wroclaw jest pierwszym miastem startowym, na ktorym redukujemy produkt do najmocniejszego rdzenia: mapa miniaturek, miejsca, covery, pamiatki, proste kolekcje, moderacja i content pipeline.

Glownym bytem systemu jest `place`. Zdjecia, pamiatki, kolekcje i zgloszenia sa przypiete do miejsca albo kolekcji miejsc. Nowe moduly nie wchodza do aktualnego zakresu, jesli nie wzmacniaja publicznej mapy.

## Local Agent integration

PhotoMaps jest zarejestrowany jako `photomaps` w wielorepozytoryjnym workflow [`local-agent`](https://github.com/MichalMatu/local-agent). Nowy chat powinien zaczac od przeczytania aktualnego `AGENTS.md`; zadania lokalne dla tego repo trafiaja wylacznie przez branch `agent-control` PhotoMaps. Szczegolowy bootstrap i kontrakt kolejki sa zapisane w `AGENTS.md`.

Dokumentacja celowo nie przypina tej integracji do numeru wersji `local-agent` — aktualny kontrakt wykonawczy jest utrzymywany w repozytorium agenta.

## Dokumenty

- [Kierunek produktu](docs/product-direction.md)
- [Content pipeline](docs/content-pipeline.md)
- [Opisy TTS zdjec](docs/create_tts.md)
- [Prompt miniatur miejsc](docs/image_generation/place-thumbnails.md)
- [Assety redakcyjne](assets/README.md)
- [Uruchamianie i testy](docs/dev.md)
- [Skrypty i Make](scripts/README.md)
- [Struktura kodu](docs/code-structure.md)

## Dev

```bash
make help
make scripts
make start
make restart
make stop
make status
make logs
make check
```
