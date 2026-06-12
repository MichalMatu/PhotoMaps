# PhotoMap

PhotoMap to wizualna mapa miejsc z klimatem. Wroclaw jest pierwszym miastem startowym, na ktorym dopracowujemy mape miniaturek, zdjecia, pamiatki, trasy/kolekcje, moderacje i content pipeline. Architektura ma od poczatku wspierac kolejne miasta.

Glownym bytem systemu jest `place`. Zdjecia, pamiatki, trasy/kolekcje, zgloszenia i przyszle rozszerzenia sa przypiete do miejsca albo kolekcji miejsc.

## Dokumenty

- [Plan działania](PLAN.md)
- [Kierunek produktu](docs/product-direction.md)
- [Content pipeline](docs/content-pipeline.md)
- [Prompt miniatur miejsc](docs/image_generation/place-thumbnails.md)
- [Assety redakcyjne](assets/README.md)
- [Uruchamianie i testy](docs/dev.md)

## Dev

```bash
make start
make restart
make stop
make status
make logs
make check
```
