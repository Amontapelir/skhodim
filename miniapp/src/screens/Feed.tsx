import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchEvents, markPurchased, type AgeGroup, type EventDto, type EventSession } from "../api";
import { EventCard } from "../components/EventCard";
import { EventMap } from "../components/EventMap";
import { TimeFilter, type TimeRange } from "../components/TimeFilter";
import { CategoryFilter } from "../components/CategoryFilter";
import { AgeRatingFilter } from "../components/AgeRatingFilter";
import { RadiusFilter, DEFAULT_RADIUS_STATE, type RadiusState } from "../components/RadiusFilter";
import { RecipientPickerModal } from "../components/RecipientPickerModal";
import { ReturnByFilter, DEFAULT_RETURN_BY_STATE, type ReturnByState } from "../components/ReturnByFilter";
import { fitsReturnBy, distanceKm } from "../travelEstimate";

const EMPTY_TIME_RANGE: TimeRange = {};

export function Feed({
  maxUserId,
  profile,
  onProfileChanged,
}: {
  maxUserId: string;
  profile: { balance: number; cinemaLimit: number; ageGroup: AgeGroup };
  /** Called after a successful "Купил" so the parent can refetch the real balance — this screen only holds the profile it was given, it doesn't own it. */
  onProfileChanged?: () => void;
}) {
  const [events, setEvents] = useState<EventDto[]>([]);
  const [fallback, setFallback] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [ratings, setRatings] = useState<number[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapVisible, setMapVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingEvent, setSendingEvent] = useState<{ id: string; title: string } | null>(null);
  const [returnBy, setReturnBy] = useState<ReturnByState>(DEFAULT_RETURN_BY_STATE);
  const [radius, setRadius] = useState<RadiusState>(DEFAULT_RADIUS_STATE);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchEvents({ ...profile, ...timeRange, categories, ratings })
      .then((res) => {
        setEvents(res.events);
        setFallback(res.fallback);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [profile, timeRange, categories, ratings]);

  function handleSend(eventTitle: string, session: EventSession) {
    setSendingEvent({ id: session.id, title: eventTitle });
  }

  async function handleBuy(session: EventSession) {
    window.open(session.purchaseUrl, "_blank");
  }

  async function handleBought(session: EventSession) {
    await markPurchased(maxUserId, session.id);
    onProfileChanged?.();
    alert("Остаток обновлён.");
  }

  const hasTimeFilter = timeRange.afterHour !== undefined || timeRange.beforeHour !== undefined;
  const activeFilterCount =
    (categories.length > 0 ? 1 : 0) +
    (hasTimeFilter ? 1 : 0) +
    (ratings.length > 0 ? 1 : 0) +
    (returnBy.enabled ? 1 : 0) +
    (radius.enabled ? 1 : 0);

  const mapUserLocation = useMemo(
    () => (returnBy.enabled && returnBy.home) || (radius.enabled && radius.center) || null,
    [returnBy, radius]
  );
  const mapRadiusCircle = useMemo(
    () => (radius.enabled && radius.center ? { center: radius.center, radiusKm: radius.radiusKm } : null),
    [radius]
  );
  const renderMapActions = useCallback(
    () => `
      <button class="btn btn-secondary btn-sm" data-action="send">Отправить</button>
      <button class="btn btn-primary btn-sm" data-action="buy">Купить</button>
      <button class="btn btn-secondary btn-sm" data-action="bought">Купил</button>
    `,
    []
  );
  const handleMapAction = useCallback(
    (eventId: string, action: string) => {
      // The map balloon shows a single pin per representative event (no
      // session picker there yet) — always acts on that event's own session.
      const event = events.find((e) => e.id === eventId);
      if (!event) return;
      const session: EventSession = { id: event.id, startsAt: event.startsAt, price: event.price, purchaseUrl: event.purchaseUrl };
      if (action === "send") handleSend(event.title, session);
      if (action === "buy") handleBuy(session);
      if (action === "bought") handleBought(session);
    },
    [events]
  );

  function resetFilters() {
    setCategories([]);
    setTimeRange(EMPTY_TIME_RANGE);
    setRatings([]);
    setReturnBy(DEFAULT_RETURN_BY_STATE);
    setRadius(DEFAULT_RADIUS_STATE);
  }

  // Memoized so EventMap's placemark-rebuild effect only re-fires when the
  // actual filtered set changes, not on every incidental re-render (Yandex's
  // custom icon/balloon layouts don't get fully cleaned up by removeAll() on
  // rapid rebuilds, which was silently piling up stale, unclickable pins).
  const visibleEvents = useMemo(
    () =>
      events
        .filter((e) => !returnBy.enabled || !returnBy.home || fitsReturnBy(e, { home: returnBy.home, returnByTime: returnBy.returnByTime }))
        .filter(
          (e) =>
            !radius.enabled ||
            !radius.center ||
            !e.venue ||
            distanceKm(radius.center, [e.venue.lat, e.venue.lon]) <= radius.radiusKm
        ),
    [events, returnBy, radius]
  );

  return (
    <div>
      {/* Overview map of every currently filtered event (not just invites) —
          a fixed section at the top rather than a Список/Карта toggle, so it's
          always in view alongside the list below. */}
      {!loading && !error && visibleEvents.length > 0 && mapVisible && (
        <div className="map-overview">
          <EventMap
            events={visibleEvents}
            userLocation={mapUserLocation}
            radiusCircle={mapRadiusCircle}
            renderActions={renderMapActions}
            onAction={handleMapAction}
          />
        </div>
      )}

      <div className="filters-bar">
        <button className="filters-toggle" onClick={() => setFiltersOpen((v) => !v)}>
          Фильтры
          {activeFilterCount > 0 && <span className="filters-badge">{activeFilterCount}</span>}
          <span className={`filters-chevron ${filtersOpen ? "open" : ""}`}>⌄</span>
        </button>
        <button className="filters-toggle map-toggle" onClick={() => setMapVisible((v) => !v)}>
          {mapVisible ? "Скрыть карту" : "Показать карту"}
        </button>
      </div>

      {filtersOpen && (
        <div className="filters-panel">
          <div className="filter-group">
            <span className="filter-group-label">Категория</span>
            <CategoryFilter selected={categories} onChange={setCategories} />
          </div>
          <div className="filter-group">
            <span className="filter-group-label">Время</span>
            <TimeFilter value={timeRange} onChange={setTimeRange} />
          </div>
          <div className="filter-group">
            <span className="filter-group-label">Возрастной ценз</span>
            <AgeRatingFilter value={ratings} onChange={setRatings} />
          </div>
          <div className="filter-group">
            <span className="filter-group-label">Радиус</span>
            <RadiusFilter value={radius} onChange={setRadius} />
          </div>
          <div className="filter-group">
            <span className="filter-group-label">Дорога туда и обратно</span>
            <ReturnByFilter value={returnBy} onChange={setReturnBy} />
          </div>
          {activeFilterCount > 0 && (
            <button className="filters-reset" onClick={resetFilters}>
              Сбросить фильтры
            </button>
          )}
        </div>
      )}

      {fallback && (
        <div className="fallback-banner">
          Ничего не нашлось на выбранные даты — показываем ближайшие доступные варианты.
        </div>
      )}

      {error && <div className="empty-state">Ошибка загрузки: {error}</div>}
      {loading && <div className="empty-state">Загрузка…</div>}
      {!loading && !error && visibleEvents.length === 0 && (
        <div className="empty-state">
          {events.length === 0
            ? "Событий не найдено."
            : returnBy.enabled
              ? "Ни на одно событие вы не успеете съездить и вернуться в срок."
              : "В выбранном радиусе событий нет — попробуйте увеличить его."}
        </div>
      )}

      {!loading &&
        !error &&
        visibleEvents.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onSend={(session) => handleSend(event.title, session)}
            onBuy={handleBuy}
            onBought={handleBought}
          />
        ))}

      {sendingEvent && (
        <RecipientPickerModal
          maxUserId={maxUserId}
          eventId={sendingEvent.id}
          eventTitle={sendingEvent.title}
          onClose={() => setSendingEvent(null)}
          onSent={() => {
            setSendingEvent(null);
            alert("Приглашение отправлено.");
          }}
        />
      )}
    </div>
  );
}
