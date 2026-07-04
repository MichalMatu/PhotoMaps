import { useRef } from "react";
import type { KeyboardEvent } from "react";

type AdminSegmentedControlItem<T extends string> = {
  count?: number;
  key: T;
  label: string;
};

type Props<T extends string> = {
  activeKey: T;
  ariaLabel: string;
  items: ReadonlyArray<AdminSegmentedControlItem<T>>;
  onChange: (key: T) => void;
};

const SEGMENTED_CONTROL_KEYS = new Set(["ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp", "End", "Home"]);

export function nextSegmentedControlIndex(currentIndex: number, itemCount: number, key: string): number {
  if (itemCount <= 0) {
    return currentIndex;
  }

  if (key === "Home") {
    return 0;
  }

  if (key === "End") {
    return itemCount - 1;
  }

  if (key === "ArrowRight" || key === "ArrowDown") {
    return (currentIndex + 1 + itemCount) % itemCount;
  }

  if (key === "ArrowLeft" || key === "ArrowUp") {
    return (currentIndex - 1 + itemCount) % itemCount;
  }

  return currentIndex;
}

export function AdminSegmentedControl<T extends string>({ activeKey, ariaLabel, items, onChange }: Props<T>) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.key === activeKey),
  );

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    if (!SEGMENTED_CONTROL_KEYS.has(event.key)) {
      return;
    }

    event.preventDefault();
    const nextIndex = nextSegmentedControlIndex(currentIndex, items.length, event.key);
    const nextItem = items[nextIndex];
    if (!nextItem) {
      return;
    }

    onChange(nextItem.key);
    buttonRefs.current[nextIndex]?.focus();
  }

  return (
    <div className="admin-segment-tabs" role="tablist" aria-label={ariaLabel}>
      {items.map((item, index) => {
        const isActive = activeKey === item.key;
        return (
          <button
            className={isActive ? "admin-segment-tab is-active" : "admin-segment-tab"}
            key={item.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={index === activeIndex ? 0 : -1}
            ref={(element) => {
              buttonRefs.current[index] = element;
            }}
            onClick={() => onChange(item.key)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {item.label}
            {typeof item.count === "number" ? <span className="admin-segment-tab-count">{item.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
