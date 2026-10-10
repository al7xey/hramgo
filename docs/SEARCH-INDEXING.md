# Search indexing

HramGo is verified in Yandex Webmaster and Google Search Console. The verification tags are maintained in `src/app/layout.tsx`. Both engines use the public `https://hramgo.ru/sitemap.xml`, also advertised in `robots.txt`.

After publishing an export, run:

```sh
npm run seo:notify
npm run seo:notify -- --submit
```

The first command is a dry run. Submission sends only new or changed exported pages to Yandex IndexNow, in batches. It rejects URLs containing query parameters, fragments, credentials, or a different origin. It verifies that the published sitemap exactly matches the local export before submitting.

The IndexNow key is stored in the ignored `.cache/hramgo/indexnow/key.txt`. Its matching UTF-8 proof file is installed at the site's static root. Preserve that proof when replacing a release directory; do not commit the key. Notification state is kept in `.cache/hramgo/indexnow/state.json`; preserve it to avoid sending unchanged pages again. Exported HTML hashes detect changes.

HTTP 200 means URLs were accepted with a verified key; HTTP 202 means the URLs were received but key verification is pending. Neither response guarantees inclusion in search results. Google receives bulk changes through its sitemap report; its restricted Indexing API is not used for ordinary temple pages.

On 7 October 2026 the existing sitemap was submitted again through Google Search Console and requested for recrawling through Yandex Webmaster. The 771 canonical page URLs were also sent to Yandex IndexNow, which returned HTTP 202. The consoles showed 206 indexed pages in Google and 413 in Yandex at that time; those figures precede processing this submission.

## Yandex Metrika

Counter `113502041` belongs to HramGo (`hramgo.ru`, Moscow time). It is linked to the HTTPS property in Webmaster, with crawling through the counter enabled.

`src/components/analytics/yandex-metrika.tsx` mounts in the common app shell. The external script is not requested before explicit visitor consent. The saved choice can be changed through “Настройки аналитики” in the footer. Declining stops the counter. There is deliberately no noscript tracking pixel, which would bypass consent.

SPA navigation sends one manual page hit per changed pathname. Search parameters, hash fragments, location coordinates, payment identifiers and form contents are excluded. Webvisor, clickmap and automatic link tracking are enabled; the support payment form carries `ym-hide-content`, so its contents are masked in Webvisor recordings. No ecommerce data layer is configured. The privacy page explains the counter and the saved browser preference. `tests/analytics.test.ts` verifies URL sanitization.
