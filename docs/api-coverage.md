# Покрытие API фронтом

Сверка схемы https://setanta.pythonanywhere.com/api/v1/schema с кодом
`src/api/endpoints/*` на 23.10.2026.

Итого: **61** операция, подключено **46**, не подключено **15** — из них
7 не нужны (➖) и 8 действительно не подключены (❌).

✅ подключено · ➖ не нужно, данные приходят другим путём · ❌ не подключено

## auth — 4/4

|     | Метод | Путь            | Где                                |
| --- | ----- | --------------- | ---------------------------------- |
| ✅  | POST  | `/auth/login`   | Login                              |
| ✅  | POST  | `/auth/logout`  | useAuth                            |
| ✅  | POST  | `/auth/refresh` | `api/client.ts`, обновление токена |
| ✅  | GET   | `/auth/me`      | AppShell                           |

## advertisers — 9/11

|     | Метод  | Путь                                          | Где                                                             |
| --- | ------ | --------------------------------------------- | --------------------------------------------------------------- |
| ✅  | GET    | `/advertisers`                                | Рекламодатели, Статус оплаты, Пользователи, Presence, Dashboard |
| ✅  | POST   | `/advertisers`                                | Карточка бренда                                                 |
| ✅  | GET    | `/advertisers/{id}`                           | Сайдбар/топбар и бренд рекламодателя                            |
| ➖  | PUT    | `/advertisers/{id}`                           | правим через PATCH                                              |
| ✅  | PATCH  | `/advertisers/{id}`                           | Карточка бренда, статус бренда                                  |
| ✅  | DELETE | `/advertisers/{id}`                           | Рекламодатели                                                   |
| ➖  | GET    | `/advertisers/{advertiser_id}/contracts`      | список берём из `GET /contracts`                                |
| ✅  | POST   | `/advertisers/{advertiser_id}/contracts`      | Карточка бренда, ContractModal, «Создать оплату»                |
| ✅  | GET    | `/advertisers/{advertiser_id}/contracts/{id}` | Статус оплаты — поповер «Бюджет / Прибыль»                      |
| ✅  | PATCH  | `/advertisers/{advertiser_id}/contracts/{id}` | Карточка бренда                                                 |
| ✅  | DELETE | `/advertisers/{advertiser_id}/contracts/{id}` | Карточка бренда — сохранение формы с убранным договором         |

## campaigns — 3/5

|     | Метод | Путь              | Где                                       |
| --- | ----- | ----------------- | ----------------------------------------- |
| ✅  | GET   | `/campaigns`      | Размещения (`useScope`)                   |
| ✅  | POST  | `/campaigns`      | CampaignForm                              |
| ❌  | GET   | `/campaigns/{id}` | `campaignsApi.get` есть, но не вызывается |
| ➖  | PUT   | `/campaigns/{id}` | правим через PATCH                        |
| ✅  | PATCH | `/campaigns/{id}` | CampaignForm                              |

## channels — 0/6

Раздел «Площадки» (`Channels.jsx`, `ChannelForm.jsx`, площадки в
`CampaignStats.jsx`) работает на моке `DataContext`, в меню скрыт.

|     | Метод  | Путь             |
| --- | ------ | ---------------- |
| ❌  | GET    | `/channels`      |
| ❌  | POST   | `/channels`      |
| ❌  | GET    | `/channels/{id}` |
| ❌  | PUT    | `/channels/{id}` |
| ❌  | PATCH  | `/channels/{id}` |
| ❌  | DELETE | `/channels/{id}` |

## contracts — 22/24

|     | Метод  | Путь                                    | Где                                                                    |
| --- | ------ | --------------------------------------- | ---------------------------------------------------------------------- |
| ✅  | GET    | `/contracts`                            | Статус оплаты — список, бренд по `advertiserId`                        |
| ➖  | POST   | `/contracts`                            | `advertiserId` только на чтение — создаём через бренд                  |
| ✅  | GET    | `/contracts/{id}`                       | Статус оплаты — карточка договора (папочка)                            |
| ➖  | PUT    | `/contracts/{id}`                       | заменяет договор целиком — правим через PATCH                          |
| ✅  | PATCH  | `/contracts/{id}`                       | Статус оплаты, ContractModal, ContractPreviewModal                     |
| ✅  | DELETE | `/contracts/{id}`                       | Карточка бренда (кнопка удаления), ContractModal                       |
| ✅  | PATCH  | `/contracts/{id}/amounts`               | Статус оплаты, Размещения — ручная правка сумм                         |
| ✅  | PATCH  | `/contracts/{id}/campaign-info`         | ContractModal (рекламодатель)                                          |
| ✅  | PUT    | `/contracts/{id}/payment-status`        | Статус оплаты, Размещения                                              |
| ✅  | GET    | `/contracts/{id}/payments`              | Статус оплаты, Размещения — история в поповере сумм                    |
| ✅  | POST   | `/contracts/{id}/payments`              | Статус оплаты, Размещения — «разовое поступление», с `Idempotency-Key` |
| ✅  | PATCH  | `/contracts/{id}/payments/{payment_id}` | Статус оплаты, Размещения                                              |
| ✅  | DELETE | `/contracts/{id}/payments/{payment_id}` | Статус оплаты, Размещения                                              |
| ✅  | GET    | `/contracts/{id}/status-log`            | Статус оплаты, Размещения — история в поповере статуса                 |

### Отчёты договора — 10/10

|     | Метод  | Путь                                                         | Где                        |
| --- | ------ | ------------------------------------------------------------ | -------------------------- |
| ✅  | GET    | `/contracts/{contract_id}/reports`                           | MediaReport, CampaignStats |
| ✅  | GET    | `/contracts/{contract_id}/reports/imports`                   | MediaReport                |
| ✅  | GET    | `/contracts/{contract_id}/reports/{period}`                  | MediaReport                |
| ✅  | DELETE | `/contracts/{contract_id}/reports/{period}`                  | MediaReport                |
| ✅  | GET    | `/contracts/{contract_id}/reports/{period}/export`           | MediaReport                |
| ✅  | POST   | `/contracts/{contract_id}/reports/{period}/import`           | MediaReport                |
| ✅  | GET    | `/contracts/{contract_id}/reports/{period}/manual`           | MediaReport                |
| ✅  | POST   | `/contracts/{contract_id}/reports/{period}/manual`           | CampaignReportPanels       |
| ✅  | PUT    | `/contracts/{contract_id}/reports/{period}/sheets/{code}`    | ReportSheetTable           |
| ✅  | GET    | `/contracts/{contract_id}/reports/{period}/total-statistics` | MediaReport                |

## files — 2/2

|     | Метод | Путь                     | Где                                                     |
| --- | ----- | ------------------------ | ------------------------------------------------------- |
| ✅  | POST  | `/files`                 | FilePicker                                              |
| ✅  | GET   | `/files/{slug}/download` | ссылкой через `fileHref` (Avatar, Modal, формы, отчёты) |

## reports (просмотры) — 2/3

|     | Метод | Путь                                 | Где                                             |
| --- | ----- | ------------------------------------ | ----------------------------------------------- |
| ✅  | GET   | `/reports/views-statistics`          | Статистика, итоги за период (`usePeriodTotals`) |
| ➖  | GET   | `/reports/{period}/views-statistics` | всегда берём диапазоном, даже за один месяц     |
| ✅  | POST  | `/reports/{period}/views-statistics` | Dashboard, сохранение аудитории                 |

## users — 4/6

|     | Метод  | Путь          | Где                    |
| --- | ------ | ------------- | ---------------------- |
| ✅  | GET    | `/users`      | Пользователи, Presence |
| ✅  | POST   | `/users`      | UserForm               |
| ❌  | GET    | `/users/{id}` | функции нет            |
| ➖  | PUT    | `/users/{id}` | правим через PATCH     |
| ✅  | PATCH  | `/users/{id}` | UserForm               |
| ✅  | DELETE | `/users/{id}` | Пользователи           |

## Моки без API в схеме

- YouTube-метрики на «Статистике» (`Dashboard.jsx`: `overviewFor`,
  `saveOverview`, `resetOverview` из `DataContext`).
