from sqlmodel import Session

from app.models.category import Category

START_CATEGORIES = [
    ("bar_mleczny", "Bar mleczny", "Klasyczne, proste jedzenie bez nadęcia.", "utensils"),
    ("street_food", "Street food", "Szybkie jedzenie z charakterem.", "sandwich"),
    ("coffee", "Kawa", "Kawiarnie dobre na spokojny przystanek.", "coffee"),
    ("viewpoint", "Punkt widokowy", "Miejsca, z których miasto wygląda inaczej.", "binoculars"),
    ("mural", "Mural", "Ściany, detale i miejskie obrazy.", "palette"),
    ("hidden_gem", "Hidden gem", "Miejsca, których łatwo nie zauważyć.", "sparkles"),
    ("cheap_food", "Tanie jedzenie", "Dobre opcje na mniejszy budżet.", "coins"),
    ("date_spot", "Na randkę", "Miejsca z klimatem bez spiny.", "heart"),
    ("rainy_day", "Na deszcz", "Pomysły, gdy pogoda nie pomaga.", "cloud-rain"),
    ("after_22", "Po 22:00", "Adresy, które nadal mają sens wieczorem.", "moon"),
    ("local_classic", "Lokalny klasyk", "Miejsca mocno wpisane w miasto.", "landmark"),
]


def seed_categories(session: Session) -> None:
    for sort_order, (category_id, label, description, icon) in enumerate(START_CATEGORIES):
        category = session.get(Category, category_id)
        if category is None:
            session.add(
                Category(
                    id=category_id,
                    label=label,
                    description=description,
                    icon=icon,
                    sort_order=sort_order,
                )
            )
    session.commit()
