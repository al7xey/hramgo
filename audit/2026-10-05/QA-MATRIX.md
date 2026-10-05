# HramGo — оставшаяся интерактивная QA

Эта матрица содержит **не выполненные** проверки. Дата исходного аудита — 5 октября 2026. Статус каждой строки: TODO до реального browser/device run. Проверка кода и HTTP не заменяет результат.

| Разрешение | Главная | Каталог/длинное имя | Фильтры/станции | Храм/расписание | Карта/превью | Горизонтальный overflow |
|---|---|---|---|---|---|---|
| 320 | TODO | TODO | TODO | TODO | TODO | TODO |
| 360 | TODO | TODO | TODO | TODO | TODO | TODO |
| 375 | TODO | TODO | TODO | TODO | TODO | TODO |
| 390 | TODO | TODO | TODO | TODO | TODO | TODO |
| 430 | TODO | TODO | TODO | TODO | TODO | TODO |
| 768 | TODO | TODO | TODO | TODO | TODO | TODO |
| 820 | TODO | TODO | TODO | TODO | TODO | TODO |
| 1024 | TODO | TODO | TODO | TODO | TODO | TODO |
| 1280 | TODO | TODO | TODO | TODO | TODO | TODO |
| 1366 | TODO | TODO | TODO | TODO | TODO | TODO |
| 1440 | TODO | TODO | TODO | TODO | TODO | TODO |
| 1920 | TODO | TODO | TODO | TODO | TODO | TODO |

Для каждого размера: записать browser/version, viewport width×height, zoom, screenshot, scrollWidth/clientWidth, bounding boxes меню/CTA, обнаруженную ошибку и ID задачи. Проверять также границы 767/768 и 1023/1024, 200% текста и 400% reflow. Отдельно iOS Safari и Android Chrome, portrait/landscape, открытая клавиатура, safe-area, динамическая адресная строка.

Сквозные сценарии:

1. Рядом со мной: granted/denied/timeout; количество действий до ближайшего результата.
2. Сегодня вечером: выбранная дата остаётся, результаты не подменяются обычной неделей.
3. После18:00: входят 18:30/19:00, если подтверждены; не только18:00.
4. Станция Красносельская: выдача, поиск станции в фильтрах, маршрут.
5. Незнакомый район, телефон одной рукой: место → следующая служба → маршрут, записать реальные секунды.
6. Известный храм: адрес/фото/служба/телефон/сайт/маршрут без лишнего возврата.
7. Прямой вход в храм: breadcrumb/возврат не ведёт на внешний сайт.

Список → карта → храм → назад: сохранить параметры, выбранный объект, список и viewport. Ноль результатов: доступны снятие фильтра/изменение запроса. Network slow/offline/SDK blocked: явная ошибка и восстановление, не бесконечный skeleton. Повторить карту10раз: heap и задержки не растут без границ.

Accessibility: Tab/Shift+Tab/Enter/Space/стрелки; focus виден и не перекрыт; NVDA и VoiceOver озвучивают labels/status/expanded. Контраст — по computed/composited цветам обеих тем. Map имеет эквивалентный HTML-список.

Performance: cold mobile trace на главной/каталоге/храме/карте, фиксированное throttling, минимум3прогона, медиана lab отдельно от field p75. Не подменять LCP/INP/CLS HTTP-временем.
