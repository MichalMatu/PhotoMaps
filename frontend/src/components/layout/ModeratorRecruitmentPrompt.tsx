import { ExternalLink, UsersRound, X } from "lucide-react";
import { useState } from "react";

export const MODERATOR_RECRUITMENT_STORAGE_KEY = "photomap:moderator-recruitment:v1";
const MODERATOR_RECRUITMENT_DISMISSED_VALUE = "dismissed";
const MODERATOR_RECRUITMENT_URL =
  "https://github.com/MichalMatu/photomap/issues/new?title=Chc%C4%99%20pom%C3%B3c%20przy%20PhotoMap";

function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function isModeratorRecruitmentDismissed(storage: Pick<Storage, "getItem"> | null = browserStorage()) {
  if (!storage) return false;
  try {
    return storage.getItem(MODERATOR_RECRUITMENT_STORAGE_KEY) === MODERATOR_RECRUITMENT_DISMISSED_VALUE;
  } catch {
    return false;
  }
}

export function dismissModeratorRecruitment(storage: Pick<Storage, "setItem"> | null = browserStorage()) {
  if (!storage) return;
  try {
    storage.setItem(MODERATOR_RECRUITMENT_STORAGE_KEY, MODERATOR_RECRUITMENT_DISMISSED_VALUE);
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

export function ModeratorRecruitmentPrompt() {
  const [isVisible, setIsVisible] = useState(() => !isModeratorRecruitmentDismissed());

  if (!isVisible) return null;

  const dismiss = () => {
    dismissModeratorRecruitment();
    setIsVisible(false);
  };

  return (
    <aside className="moderator-recruitment ui-panel" role="dialog" aria-labelledby="moderator-recruitment-title">
      <div className="moderator-recruitment-icon" aria-hidden="true">
        <UsersRound size={20} />
      </div>
      <button className="moderator-recruitment-close" type="button" aria-label="Zamknij zaproszenie" onClick={dismiss}>
        <X aria-hidden="true" size={18} />
      </button>
      <div className="moderator-recruitment-copy">
        <strong id="moderator-recruitment-title">Szukam moderatorów</strong>
        <p>
          Chcesz współtworzyć PhotoMap? Szukam kilku osób do moderacji miejsc i zdjęć, pracy nad treściami oraz dalszego
          rozwijania strony.
        </p>
      </div>
      <a
        className="ui-button ui-button--primary moderator-recruitment-action"
        href={MODERATOR_RECRUITMENT_URL}
        target="_blank"
        rel="noreferrer"
      >
        Chcę pomóc
        <ExternalLink aria-hidden="true" size={15} />
      </a>
    </aside>
  );
}
