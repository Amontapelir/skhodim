declare global {
  interface Window {
    ymaps?: {
      ready(cb: () => void): void;
      route(
        points: Array<[number, number]>,
        options?: Record<string, unknown>
      ): Promise<{ getHumanTime(): string; getHumanLength(): string }>;
    };
  }
}

const API_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY as string | undefined;

export function isTravelTimeAvailable(): boolean {
  return !!API_KEY && !API_KEY.startsWith("[");
}

let loadPromise: Promise<void> | null = null;

function loadYandexMapsScript(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${API_KEY}&lang=ru_RU`;
    script.onerror = () => reject(new Error("Не удалось загрузить Яндекс.Карты"));
    script.onload = () => {
      window.ymaps!.ready(() => resolve());
    };
    document.head.appendChild(script);
  });
  return loadPromise;
}

export function getUserLocation(): Promise<[number, number]> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Геолокация не поддерживается браузером"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve([pos.coords.latitude, pos.coords.longitude]),
      (err) => reject(new Error(`Не удалось определить местоположение: ${err.message}`)),
      { timeout: 10000 }
    );
  });
}

export interface TravelTime {
  humanTime: string;
  humanLength: string;
}

/** Route duration/distance from the user's current location to a venue, via Yandex Maps. */
export async function travelTimeTo(destination: [number, number]): Promise<TravelTime> {
  if (!isTravelTimeAvailable()) {
    throw new Error("Ключ Яндекс.Карт не настроен (VITE_YANDEX_MAPS_API_KEY)");
  }
  const origin = await getUserLocation();
  await loadYandexMapsScript();
  const route = await window.ymaps!.route([origin, destination]);
  return { humanTime: route.getHumanTime(), humanLength: route.getHumanLength() };
}
