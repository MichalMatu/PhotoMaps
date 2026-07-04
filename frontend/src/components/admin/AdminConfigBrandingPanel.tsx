type Props = {
  colorInputValue: string;
  logoUrl: string;
  primaryColor: string;
  onLogoUrlChange: (logoUrl: string) => void;
  onPrimaryColorChange: (primaryColor: string) => void;
};

export function AdminConfigBrandingPanel({
  colorInputValue,
  logoUrl,
  onLogoUrlChange,
  onPrimaryColorChange,
  primaryColor,
}: Props) {
  return (
    <fieldset className="ui-fieldset admin-config-panel">
      <legend>Branding</legend>
      <label>
        Kolor główny
        <span className="admin-color-field">
          <input type="color" value={colorInputValue} onChange={(event) => onPrimaryColorChange(event.target.value)} />
          <input value={primaryColor} onChange={(event) => onPrimaryColorChange(event.target.value)} />
        </span>
      </label>
      <label>
        Logo URL
        <input value={logoUrl} onChange={(event) => onLogoUrlChange(event.target.value)} />
      </label>
    </fieldset>
  );
}
