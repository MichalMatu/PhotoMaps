import { cloneElement, useCallback, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { CircleHelp } from "lucide-react";

export type SettingHintCopy = {
  title: string;
  body: string;
  effect?: string;
  range?: string;
};

type SettingFieldControlProps = {
  id?: string;
  "aria-describedby"?: string;
  describedBy?: string;
};

type SettingFieldBaseProps = {
  footer?: ReactNode;
  id: string;
  label: string;
  hint?: SettingHintCopy;
  helpMode?: "inline" | "popover";
};

type SettingFieldNativeProps = SettingFieldBaseProps & {
  children: ReactElement<SettingFieldControlProps>;
  controlMode?: "native";
  describedByProp?: "aria-describedby" | "describedBy";
};

type SettingFieldCompositeProps = SettingFieldBaseProps & {
  children: ReactNode;
  controlMode: "composite";
};

type Props = SettingFieldNativeProps | SettingFieldCompositeProps;

type PopoverPlacement = "bottom" | "top";

export function resolveHintPopoverPlacement({
  popoverHeight,
  triggerBottom,
  triggerTop,
  viewportGap = 16,
  viewportHeight,
}: {
  popoverHeight: number;
  triggerBottom: number;
  triggerTop: number;
  viewportGap?: number;
  viewportHeight: number;
}): PopoverPlacement {
  const hasEnoughBottomSpace = viewportHeight - triggerBottom >= popoverHeight + viewportGap;
  const hasBetterTopSpace = triggerTop >= popoverHeight + viewportGap;
  return !hasEnoughBottomSpace && hasBetterTopSpace ? "top" : "bottom";
}

function SettingHintContent({ hint }: { hint: SettingHintCopy }) {
  return (
    <>
      <strong className="ui-field-hint-title">{hint.title}</strong>
      <span>{hint.body}</span>
      {hint.effect ? (
        <span>
          <span className="ui-field-hint-label">Wpływ:</span> {hint.effect}
        </span>
      ) : null}
      {hint.range ? (
        <span>
          <span className="ui-field-hint-label">Zakres:</span> {hint.range}
        </span>
      ) : null}
    </>
  );
}

export function SettingField(props: Props) {
  const { footer, helpMode = "popover", hint, id, label } = props;
  const hintId = hint ? `${id}-hint` : undefined;
  const isComposite = props.controlMode === "composite";
  const isInlineHelp = helpMode === "inline";
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const hintTriggerRef = useRef<HTMLButtonElement | null>(null);
  const hintPopoverRef = useRef<HTMLSpanElement | null>(null);
  const [popoverPlacement, setPopoverPlacement] = useState<PopoverPlacement>("bottom");
  const updatePopoverPlacement = useCallback(() => {
    const field = fieldRef.current;
    const popover = hintPopoverRef.current;
    if (!field || !popover) {
      return;
    }

    const fieldRect = field.getBoundingClientRect();
    const popoverHeight = popover.getBoundingClientRect().height;
    setPopoverPlacement(
      resolveHintPopoverPlacement({
        popoverHeight,
        triggerBottom: fieldRect.bottom,
        triggerTop: fieldRect.top,
        viewportHeight: window.innerHeight,
      }),
    );
  }, []);
  const control = isComposite
    ? props.children
    : cloneElement(props.children, {
        id,
        [props.describedByProp ?? "aria-describedby"]:
          [props.children.props[props.describedByProp ?? "aria-describedby"], hintId].filter(Boolean).join(" ") ||
          undefined,
      });

  return (
    <div ref={fieldRef} className={`ui-setting-field ui-setting-field--${helpMode}`}>
      <div className="ui-setting-field-label-row">
        {isComposite ? (
          <span className="ui-setting-field-label">{label}</span>
        ) : (
          <label className="ui-setting-field-label" htmlFor={id}>
            {label}
          </label>
        )}
        {hint && !isInlineHelp ? (
          <span
            className="ui-field-hint"
            data-popover-placement={popoverPlacement}
            onFocusCapture={updatePopoverPlacement}
            onPointerEnter={updatePopoverPlacement}
          >
            <button
              ref={hintTriggerRef}
              type="button"
              className="ui-field-hint-trigger"
              aria-label={`Pokaż opis pola: ${label}`}
              aria-describedby={hintId}
            >
              <CircleHelp aria-hidden="true" size={16} strokeWidth={2.2} />
            </button>
            <span ref={hintPopoverRef} className="ui-field-hint-popover" id={hintId} role="tooltip">
              <SettingHintContent hint={hint} />
            </span>
          </span>
        ) : null}
      </div>
      {hint && isInlineHelp ? (
        <span className="ui-setting-field-inline-help" id={hintId}>
          <SettingHintContent hint={hint} />
        </span>
      ) : null}
      {control}
      {footer}
    </div>
  );
}
