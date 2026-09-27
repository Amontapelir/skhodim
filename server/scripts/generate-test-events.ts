import { writeFileSync } from "fs";
import { join } from "path";

// Тестовый срез: события НЕ являются реальными данными об афише Москвы.
const GENERATED_AT = "2026-09-27";

const venues = [
  { name: "Театр «Современник»", address: "Чистопрудный бул., 19А", lat: 55.7644, lon: 37.6531 },
  { name: "Кинотеатр «Художественный»", address: "Арбатская пл., 14", lat: 55.7521, lon: 37.6012 },
  { name: "Концертный зал «Зарядье»", address: "ул. Мосфильмовская, 1", lat: 55.7508, lon: 37.6297 },
  { name: "Музей современного искусства «Гараж»", address: "Крымский Вал, 9", lat: 55.7317, lon: 37.6015 },
  { name: "ДК «Рассвет»", address: "Ленинградский пр-т, 78", lat: 55.7982, lon: 37.5312 },
  { name: "Театр им. Вахтангова", address: "ул. Арбат, 26", lat: 55.7497, lon: 37.5924 },
  { name: "Кинотеатр «Пионер»", address: "Кутузовский пр-т, 21", lat: 55.7391, lon: 37.5372 },
  { name: "Планетарий", address: "ул. Садовая-Кудринская, 5", lat: 55.7639, lon: 37.5789 },
  { name: "Третьяковская галерея", address: "Лаврушинский пер., 10", lat: 55.7415, lon: 37.6208 },
  { name: "Дом музыки", address: "Космодамианская наб., 52", lat: 55.7350, lon: 37.6428 },
];

const titles = [
  {
    title: "Евгений Онегин",
    category: "theatre",
    minAge: 12,
    description: "Классическая постановка романа Пушкина в стихах — история любви, чести и упущенных возможностей.",
  },
  {
    title: "Чайка",
    category: "theatre",
    minAge: 14,
    description: "Чеховская драма о художниках, разбитых сердцах и поиске своего места в искусстве.",
  },
  {
    title: "Иван Васильевич меняет профессию",
    category: "cinema",
    minAge: 0,
    description: "Комедия о путешествии во времени, царе и обычном инженере, случайно поменявшихся местами.",
  },
  {
    title: "Дюна: Пророчество",
    category: "cinema",
    minAge: 16,
    description: "Продолжение саги о пустынной планете Арракис, борьбе за власть и древних пророчествах.",
  },
  {
    title: "Симфония №9",
    category: "concert",
    minAge: 6,
    description: "Симфонический оркестр исполняет одно из самых масштабных произведений классической музыки.",
  },
  {
    title: "Ночь джаза",
    category: "concert",
    minAge: 12,
    description: "Живой джаз в исполнении московских музыкантов — импровизации, соло и атмосфера ночного клуба.",
  },
  {
    title: "Импрессионисты",
    category: "exhibition",
    minAge: 0,
    description: "Выставка репродукций французских импрессионистов — свет, цвет и мимолётные впечатления.",
  },
  {
    title: "Космос и мы",
    category: "exhibition",
    minAge: 6,
    description: "Интерактивная выставка о космосе: макеты ракет, скафандры и история освоения орбиты.",
  },
  {
    title: "Щелкунчик",
    category: "theatre",
    minAge: 6,
    description: "Балет-сказка Чайковского о девочке Мари, заколдованном принце и битве с Мышиным королём.",
  },
  {
    title: "Стендап-вечер",
    category: "concert",
    minAge: 18,
    description: "Открытый микрофон и сеты приглашённых комиков — юмор для взрослой аудитории.",
  },
  {
    title: "Гарри Поттер и философский камень",
    category: "cinema",
    minAge: 6,
    description: "Первый фильм саги: мальчик узнаёт, что он волшебник, и отправляется в Хогвартс.",
  },
  {
    title: "Русский авангард",
    category: "museum",
    minAge: 12,
    description: "Экспозиция живописи и графики русских авангардистов начала XX века.",
  },
];

const sources = ["test", "test-mirror"] as const;

function randomDate(): string {
  const day = 1 + Math.floor(Math.random() * 30);
  const hour = 10 + Math.floor(Math.random() * 12);
  const d = new Date(Date.UTC(2026, 9, day, hour, 0, 0));
  return d.toISOString();
}

function randomPrice(category: string): number {
  if (category === "cinema") return [250, 300, 350, 400][Math.floor(Math.random() * 4)];
  return [300, 500, 700, 900, 1200][Math.floor(Math.random() * 5)];
}

const events = [];
let idCounter = 1;

for (let i = 0; i < 70; i++) {
  const t = titles[i % titles.length];
  const venue = venues[i % venues.length];
  const startsAt = randomDate();
  const price = randomPrice(t.category);
  const externalId = `E${1000 + idCounter}`;
  events.push({
    externalId,
    source: "test",
    title: t.title,
    description: t.description,
    venue,
    category: t.category,
    minAge: t.minAge,
    price,
    startsAt,
    purchaseUrl: `https://example.org/tickets/${externalId}`,
  });
  idCounter++;

  // ~15% chance of a near-duplicate from a "mirror" source, to exercise dedup.
  if (Math.random() < 0.15) {
    const dupExternalId = `M${2000 + idCounter}`;
    events.push({
      externalId: dupExternalId,
      source: "test-mirror",
      title: t.title + (Math.random() < 0.5 ? "!" : ""),
      description: t.description,
      venue,
      category: t.category,
      minAge: t.minAge,
      price,
      startsAt,
      purchaseUrl: `https://example-mirror.org/e/${dupExternalId}`,
    });
    idCounter++;
  }
}

const output = {
  meta: {
    source: "тестовый срез",
    generatedAt: GENERATED_AT,
    note: "Данные вымышлены для разработки MVP и не отражают реальную афишу.",
  },
  events,
};

writeFileSync(join(__dirname, "..", "data", "events.test.json"), JSON.stringify(output, null, 2), "utf-8");
console.log(`Generated ${events.length} test events.`);
