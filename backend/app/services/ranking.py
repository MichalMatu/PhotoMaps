from app.models.place import Place


def place_score(place: Place) -> float:
    return (place.photo_count + place.memory_count * 2) * place.weight
