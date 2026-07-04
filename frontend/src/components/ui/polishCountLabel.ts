type PolishCountForms = {
  few: string;
  many: string;
  one: string;
};

const polishPluralRules = new Intl.PluralRules("pl");

export function polishCountLabel(count: number, forms: PolishCountForms) {
  const category = polishPluralRules.select(count);
  const label = category === "one" ? forms.one : category === "few" ? forms.few : forms.many;

  return `${count} ${label}`;
}
