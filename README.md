# Frontend

## Описание
Клиентская часть приложения на `React + TypeScript + Vite` с UI на Mantine, i18n и WebRTC‑звонками. Использует HTTP API и WebSocket‑сигнализацию сервера.

## Требования
- `bun` (рекомендуется)
- Альтернатива: `npm`/`yarn` при необходимости

## Быстрый старт
```bash
cd client
bun install
bun run dev
```

Для запуска всего проекта из корня можно использовать `./run-local.sh`.

## Скрипты
- `bun run dev` — дев‑сервер Vite
- `bun run build` — сборка
- `bun run preview` — предпросмотр билда
- `bun run lint` — линт
- `bun run prettier` — форматирование

## Переменные окружения
- `VITE_API_URL` — базовый URL API. По умолчанию `http://localhost:3000`.
- `VITE_WS_URL` — URL WebSocket‑сервера. По умолчанию `ws://localhost:8080/ws`.

## Структура
- `src/features` — фичи приложения (чаты, звонки, контакты)
- `src/stores` — Zustand‑сторы
- `src/services` — API‑клиенты
- `src/i18n` — локализация

## Заметки
- Демонстрация экрана работает только в безопасном контексте (HTTPS) или на `localhost`.
- Для звонков нужны разрешения на микрофон, для демонстрации — на экран.
