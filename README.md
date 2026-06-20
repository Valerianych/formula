# F1 Race Analytics

Сайт аналитики гонок Формулы-1 на OpenF1 API с ИИ-чатом GigaChat.

## Что умеет

- выбор сезона и гонки;
- итог гонки: топ-3, таблица пилотов, DNF/DNS/DSQ;
- подробная карточка пилота: круги, лучший круг, пит-стопы, шины, события Race Control;
- SVG-карта трассы по OpenF1 `location` x/y координатам, если API вернул данные;
- сравнение двух пилотов;
- блок “Проблемные моменты гонки” без обвинений пилотов;
- чат GigaChat по выбранной гонке;
- честные empty/error states без моков и фейковых гонок.

## Запуск

```bash
npm install
npm run dev
```

`npm run dev` запускает Express-сервер и Vite middleware, поэтому frontend и `/api/...` работают вместе.

## Переменные окружения

Скопируйте `.env.example` в `.env` или `.env.local` и заполните нужные ключи.

```env
GIGACHAT_AUTH_KEY=""
GIGACHAT_SCOPE="GIGACHAT_API_PERS"
GIGACHAT_MODEL="GigaChat"
```

`GEMINI_API_KEY` необязателен. Он используется только как fallback, если GigaChat не настроен.

## Главные API routes

```txt
GET  /api/sessions?year=2025
GET  /api/race-dashboard?session_key=12345
GET  /api/session-data?session_key=12345
GET  /api/driver-laps?session_key=12345&driver_number=1
POST /api/chat
```

Главный endpoint для фронта — `/api/race-dashboard`. Он возвращает полный пакет гонки: итог, пилотов, круги, пит-стопы, шины, позиции, интервалы, карту, погоду, Race Control, обгоны, радио и вычисленные проблемные моменты.

## Важно

OpenF1 может не возвращать часть данных для конкретной гонки. В таком случае сайт показывает пустой блок с объяснением, а не подставляет фейковые данные.
