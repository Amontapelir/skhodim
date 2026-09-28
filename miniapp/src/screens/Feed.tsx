import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchEvents, markPurchased, type AgeGroup, type EventDto } from "../api";
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

export function Feed({ maxUserId, profile }: { maxUserId: string; profile: { balance: number; cinemaLimit: number; ageGroup: AgeGroup } }) {
  const [events, setEvents] = useState<EventDto[]>([]);
  const [fallback, setFallback] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [ratings, setRatings] = useState<number[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState<"list" | "map">("list");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingEvent, setSendingEvent] = useState<EventDto | null>(null);
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

  function handleSend(eventId: string) {
    const event = events.find((e) => e.id === eventId);
    if (event) setSendingEvent(event);
  }

  async function handleBuy(event: EventDto) {
    window.open(event.purchaseUrl, "_blank");
  }

  async function handleBought(eventId: string) {
    await markPurchased(maxUserId, eventId);
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
      if (action === "send") handleSend(eventId);
      if (action === "buy") {
        const event = events.find((e) => e.id === eventId);
        if (event) handleBuy(event);
      }
      if (action === "bought") handleBought(eventId);
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
      <div className="filters-bar">
        <button className="filters-toggle" onClick={() => setFiltersOpen((v) => !v)}>
          Фильтры
          {activeFilterCount > 0 && <span className="filters-badge">{activeFilterCount}</span>}
          <span className={`filters-chevron ${filtersOpen ? "open" : ""}`}>⌄</span>
        </button>
        <div className="view-switch">
          <button className={`view-btn ${view === "list" ? "active" : ""}`} onClick={() => setView("list")}>
            Список
          </button>
          <button className={`view-btn ${view === "map" ? "active" : ""}`} onClick={() => setView("map")}>
            Карта
          </button>
        </div>
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

      {!loading && !error && visibleEvents.length > 0 && view === "map" && (
        <EventMap
          events={visibleEvents}
          userLocation={mapUserLocation}
          radiusCircle={mapRadiusCircle}
          renderActions={renderMapActions}
          onAction={handleMapAction}
        />
      )}

      {!loading &&
        !error &&
        view === "list" &&
        visibleEvents.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onSend={() => handleSend(event.id)}
            onBuy={() => handleBuy(event)}
            onBought={() => handleBought(event.id)}
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
