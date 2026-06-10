import { FormEvent, useState } from "react";
import { LockKeyhole } from "lucide-react";

import { saveAdminToken } from "../../api/client";

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

    saveAdminToken(nextToken);
    onUnlocked(nextToken);
  }

  return (
    <section className="admin-access-panel">
      <div className="admin-access-card">
        <div className="admin-access-icon" aria-hidden="true">
          <LockKeyhole size={26} />
        </div>
        <span className="eyebrow">Panel redakcji</span>
        <h1>Dostęp admina</h1>
        {message ? <p className="admin-access-message">{message}</p> : null}
        <form className="admin-access-form" onSubmit={handleSubmit}>
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
          <button type="submit">Wejdź do panelu</button>
        </form>
      </div>
    </section>
  );
}
