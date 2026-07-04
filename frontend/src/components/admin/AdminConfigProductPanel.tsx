type Props = {
  locale: string;
  productName: string;
  onLocaleChange: (locale: string) => void;
  onProductNameChange: (productName: string) => void;
};

export function AdminConfigProductPanel({ locale, onLocaleChange, onProductNameChange, productName }: Props) {
  return (
    <fieldset className="ui-fieldset admin-config-panel">
      <legend>Produkt</legend>
      <label>
        Nazwa produktu
        <input value={productName} onChange={(event) => onProductNameChange(event.target.value)} />
      </label>
      <label>
        Język
        <input value={locale} onChange={(event) => onLocaleChange(event.target.value)} />
      </label>
    </fieldset>
  );
}
