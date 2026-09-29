import { useEffect, useState } from "react";
import { createInvite, fetchContacts, requestShareCard, type Contact } from "../api";
import { canShareViaMaxBridge, getMaxUserId, shareMessageViaMaxBridge } from "../maxBridge";

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
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sharing, setSharing] = useState(false);

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
      await createInvite(eventId, maxUserId, selected, comment.trim() || undefined);
      onSent();
    } finally {
      setSending(false);
    }
  }

  // MAX's own contact/chat picker (native, outside our contacts list) — for
  // reaching anyone in the user's real MAX contacts, not just people who've
  // already messaged this bot. Only meaningful inside a real MAX client.
  async function handleShareViaMax() {
    setSharing(true);
    try {
      const { mid } = await requestShareCard(eventId, getMaxUserId() ?? maxUserId);
      shareMessageViaMaxBridge(mid);
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <p className="modal-title">Кому отправить «{eventTitle}»?</p>

        {canShareViaMaxBridge() && (
          <button className="btn btn-secondary share-via-max-btn" disabled={sharing} onClick={handleShareViaMax}>
            {sharing ? "Открываем…" : "Поделиться через MAX"}
          </button>
        )}

        <p className="modal-subtitle">Или выберите из знакомых боту:</p>

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

        <textarea
          className="invite-comment-input"
          placeholder="Комментарий (необязательно) — например, «давай сходим, я угощаю»"
          maxLength={280}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

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
