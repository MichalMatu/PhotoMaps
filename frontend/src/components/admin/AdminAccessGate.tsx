import { FormEvent, useState } from "react";
import { LockKeyhole } from "lucide-react";

import { setAdminSessionToken } from "../../api/auth";

type Props = {
  message?: string | null;
  onUnlocked: (token: string) => void;
};

export function AdminAccessGate({ message, onUnlocked }: Props) {
  const [token, setToken] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextToken = token.trim();
    if (!nextToken) {
      return;
    }

    setAdminSessionToken(nextToken);
    onUnlocked(nextToken);
  }

  return (
    <section className="admin-access-panel">
      <div className="ui-panel admin-access-card">
        {message ? <p className="admin-access-message">{message}</p> : null}
        <form className="ui-form admin-access-form" onSubmit={handleSubmit}>
          <div className="admin-access-token-row">
            <div className="admin-access-icon" aria-hidden="true">
              <LockKeyhole size={26} />
            </div>
            <label>
              Token
              <input
                autoComplete="off"
                autoFocus
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                required
              />
            </label>
          </div>
          <button className="ui-button ui-button--primary" type="submit">
            Wejdź do panelu
          </button>
        </form>
      </div>
    </section>
  );
}
