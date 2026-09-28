interface YmapsPlacemark {
  events: { add(event: string, handler: () => void): void };
  balloon: { open(): void; close(): void };
}

interface YmapsGeoObject {
  events: { add(event: string, handler: () => void): void };
}

interface YmapsMap {
  destroy(): void;
  geoObjects: { add(obj: YmapsGeoObject): void; removeAll(): void };
}

declare global {
  interface Window {
    ymaps?: {
      ready(cb: () => void): void;
      Map: new (
        container: HTMLElement,
        state: { center: [number, number]; zoom: number; controls?: string[] }
      ) => YmapsMap;
      Placemark: new (
        coordinates: [number, number],
        properties: Record<string, unknown>,
        options: Record<string, unknown>
      ) => YmapsPlacemark;
      Circle: new (
        geometry: [[number, number], number],
        properties?: Record<string, unknown>,
        options?: Record<string, unknown>
      ) => YmapsGeoObject;
      templateLayoutFactory: { createClass(template: string): unknown };
    };
  }
}

const API_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY as string | undefined;

export function isYandexMapsAvailable(): boolean {
  return !!API_KEY && !API_KEY.startsWith("[");
}

/** @deprecated use isYandexMapsAvailable */
export const isTravelTimeAvailable = isYandexMapsAvailable;

let loadPromise: Promise<void> | null = null;

export function loadYandexMaps(): Promise<void> {
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

