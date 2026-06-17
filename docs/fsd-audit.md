# FSD audit

Дата: 2026-06-17

## Итог

Проект HramGo использует FSD-подобную архитектуру для Next.js App Router:

- `src/app` — маршруты, layouts, API routes, metadata, sitemap и robots.
- `src/features` — доменная логика и типы: `temples`, `reviews`.
- `src/components` — UI-композиции, виджеты страниц и переиспользуемые компоненты.
- `src/lib` — инфраструктура: auth, prisma, env, storage, API helpers, utils.
- `src/types` — глобальные типы.

Структура подходит для текущего размера проекта и не смешивает серверную Prisma-логику с UI-компонентами.

## Исправлено

- Убрана зависимость нижнего слоя `components/theme` от верхнего слоя `app/providers`.
- `ThemeContext` и логика темы вынесены в `src/components/theme/theme-provider.tsx`.
- `src/app/providers.tsx` теперь только собирает внешние провайдеры приложения.
- Исправлена битая кодировка подписей переключателя темы.

## Соответствие FSD

Хорошо:

- Домен храмов изолирован в `src/features/temples`.
- Домен отзывов частично изолирован в `src/features/reviews`.
- Общие UI-примитивы вынесены в `src/components/ui`.
- API и страницы остаются в `src/app`, что соответствует Next.js App Router.
- Инфраструктура (`auth`, `db`, `env`, `storage`) вынесена в `src/lib`.

Архитектурные долги:

- `src/components` сейчас совмещает роли `shared/ui`, `widgets` и части `entities`.
- Доменные UI-компоненты храмов и отзывов лежат в `components`, а не рядом с `features`.
- Для строгого FSD в будущем можно перейти к слоям `shared`, `entities`, `features`, `widgets`, `app`.

## Рекомендуемый следующий шаг

Без срочной необходимости не ломать текущую структуру. Если проект продолжит расти, мигрировать постепенно:

1. `components/ui` -> `shared/ui`
2. `lib` -> `shared/lib`
3. `components/temples` + `features/temples` -> `entities/temple` и `features/temple-search`
4. `components/reviews` + `features/reviews` -> `entities/review` и `features/review-create`
5. крупные секции страниц -> `widgets`

Такой переход можно сделать без переписывания бизнес-логики.
