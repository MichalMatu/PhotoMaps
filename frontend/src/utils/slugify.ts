export type SlugSeparator = "-" | "_";

function trimSeparator(value: string, separator: SlugSeparator): string {
  const escapedSeparator = separator === "-" ? "\\-" : separator;
  return value.replace(new RegExp(`^${escapedSeparator}+|${escapedSeparator}+$`, "g"), "");
}

export function slugify(value: string, separator: SlugSeparator = "-"): string {
  return trimSeparator(
    value
      .trim()
      .toLowerCase()
      .replace(/ł/g, "l")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, separator),
    separator,
  );
}
