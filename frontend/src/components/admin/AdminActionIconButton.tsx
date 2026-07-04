import type { ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";

type AdminActionIconTone = "primary" | "secondary" | "ghost" | "danger";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon: LucideIcon;
  iconSize?: number;
  label: string;
  tone?: AdminActionIconTone;
};

const TONE_CLASS: Record<AdminActionIconTone, string> = {
  danger: "ui-button--danger",
  ghost: "ui-button--ghost",
  primary: "ui-button--primary",
  secondary: "ui-button--secondary",
};

export function AdminActionIconButton({
  className,
  icon: Icon,
  iconSize = 18,
  label,
  tone = "ghost",
  title,
  type = "button",
  ...props
}: Props) {
  return (
    <button
      {...props}
      aria-label={label}
      className={["ui-button", "admin-icon-action", TONE_CLASS[tone], className].filter(Boolean).join(" ")}
      title={title ?? label}
      type={type}
    >
      <Icon aria-hidden="true" size={iconSize} />
    </button>
  );
}
