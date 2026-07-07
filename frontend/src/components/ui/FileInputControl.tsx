type Props = {
  accept: string;
  describedBy?: string;
  file: File | null;
  id?: string;
  inputKey: string;
  isInvalid?: boolean;
  onChange: (file: File | null) => void;
};

export function FileInputControl({ accept, describedBy, file, id, inputKey, isInvalid = false, onChange }: Props) {
  return (
    <span className={isInvalid ? "file-input-control is-invalid" : "file-input-control"}>
      <span className="file-input-control-button">Wybierz plik</span>
      <span className="file-input-control-name">{file?.name ?? "Nie wybrano pliku"}</span>
      <input
        accept={accept}
        aria-describedby={describedBy}
        aria-invalid={isInvalid}
        className="file-input-control-native"
        id={id}
        key={inputKey}
        type="file"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
    </span>
  );
}
