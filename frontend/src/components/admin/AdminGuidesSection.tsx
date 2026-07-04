import type { City, Guide, Place } from "../../api/types";
import { GuideManager } from "./GuideManager";

type Props = {
  cities: City[];
  guides: Guide[];
  onChanged: () => Promise<void>;
  places: Place[];
};

export function AdminGuidesSection({ cities, guides, onChanged, places }: Props) {
  return <GuideManager cities={cities} guides={guides} places={places} onChanged={onChanged} />;
}
