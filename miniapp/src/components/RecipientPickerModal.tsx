import { useEffect, useState } from "react";
import { createInvite, fetchContacts, type Contact } from "../api";

export function RecipientPickerModal({
  maxUserId,
  eventId,
  eventTitle,
  onClose,
  onSent,
}: {
  maxUserId: string;
  eventId: string;
  eventTitle: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchContacts(maxUserId)
      .then(setContacts)
      .finally(() => setLoading(false));
  }, [maxUserId]);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function handleSend() {
    setSending(true);
    try {
      await createInvite(eventId, maxUserId, selected);
      onSent();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <p className="modal-title">Кому отправить «{eventTitle}»?</p>

        {loading && <div className="empty-state">Загрузка контактов…</div>}
        {!loading && contacts.length === 0 && (
          <div className="empty-state">Пока нет знакомых боту пользователей — они появятся, когда друзья пройдут онбординг.</div>
        )}

        <div className="contact-list">
          {contacts.map((c) => (
            <label key={c.maxUserId} className="contact-row">
              <input type="checkbox" checked={selected.includes(c.maxUserId)} onChange={() => toggle(c.maxUserId)} />
              {c.displayName ?? c.maxUserId}
            </label>
          ))}
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Отмена
          </button>
          <button className="btn btn-primary" disabled={selected.length === 0 || sending} onClick={handleSend}>
            {sending ? "Отправляем…" : `Отправить (${selected.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
