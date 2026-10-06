# Добровольная поддержка

Статический frontend `/support/` работает без аккаунтов. Python stdlib API на VPS использует существующий production-магазин ЮKassa. Секреты находятся только в `/etc/hramgo-support.env` (root 0600), не в репозитории или static export.

`server/hramgo-support.service` запускает процесс с DynamicUser, StateDirectory и ограничениями ресурсов. Порт 8788 слушает внутренний Docker gateway; Caddy проксирует только `/api/support/*`, заменяя X-Real-IP адресом соединения. Github Pages сам по себе этот API не предоставляет; домен обслуживается VPS/Caddy.

POST `/api/support/payment`: amount, email, personalDataConsent=true, idempotencyKey UUIDv4. Сумма 100–100000 RUB проверяется сервером. Одинаковая попытка не создаёт второй платёж; таймаут повторяется с прежним UUID. Redirect разрешён только на HTTPS-домены YooMoney/ЮKassa. Карта/СБП выбираются на стороне провайдера.

POST `/api/support/payment-status`: requestId. Статус проверяется GET провайдера, включая сумму, currency, metadata и paid. Query-string не подтверждает оплату. Webhook `/api/support/yookassa/webhook` только инициирует такую же проверку зарегистрированного платежа. Локальный SQLite содержит hash email, UUID и provider ID, без реквизитов карты. Исторический merchant flow сохранён: автоматическая фискализация отдельно не заявляется.

Проверки: `python -m unittest discover -s server -p 'test_*.py'`; fake-provider тестирует конкурирующие повторы, подмену параметров/статуса, недопустимый redirect, отказ провайдера и foreign Origin. Реальный smoke создаёт только pending checkout; списания денег не делает.

Официальный протокол: https://yookassa.ru/developers/using-api/interaction-format и https://yookassa.ru/developers/using-api/webhooks .

Эксплуатация: `systemctl status hramgo-support`, `GET /api/support/health`, backup закрытого SQLite перед обновлением. Не выводить EnvironmentFile или provider response с контактными данными в логи. На VPS 6 октября исчерпаны inode tmpfs /run; ёмкость увеличена до 250000 без удаления существующих файлов. Следить за inode и свободным диском; это ограничение всего хоста, не фронтенда.
