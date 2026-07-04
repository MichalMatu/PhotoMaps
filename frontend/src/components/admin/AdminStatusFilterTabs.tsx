import { AdminSegmentedControl } from "./AdminSegmentedControl";

type AdminStatusFilterOption<T extends string> = {
  count: number;
  key: T;
  label: string;
};

type Props<T extends string> = {
  activeStatus: T;
  ariaLabel: string;
  options: ReadonlyArray<AdminStatusFilterOption<T>>;
  onChange: (status: T) => void;
};

export function AdminStatusFilterTabs<T extends string>({ activeStatus, ariaLabel, options, onChange }: Props<T>) {
  return <AdminSegmentedControl activeKey={activeStatus} ariaLabel={ariaLabel} items={options} onChange={onChange} />;
}
