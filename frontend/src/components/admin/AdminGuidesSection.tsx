import type { Guide, Place } from "../../api/client";
import { GuideManager } from "./GuideManager";

type Props = {
  guides: Guide[];
  onChanged: () => Promise<void>;
  places: Place[];
};

export function AdminGuidesSection({ guides, onChanged, places }: Props) {
  return <GuideManager guides={guides} places={places} onChanged={onChanged} />;
}
