import { load } from "cheerio";

export function sitemapUrls(xml) {
  const $ = load(xml, { xml: true });
  return [
    ...new Set(
      $("url > loc")
        .map((_, node) => {
          const url = new URL($(node).text().trim());
          if (
            url.origin !== "https://hramgo.ru" ||
            url.username ||
            url.password ||
            url.search ||
            url.hash
          )
            throw new Error(
              "Sitemap must contain only public HramGo URLs without query parameters."
            );
          if (!url.pathname.endsWith("/")) url.pathname += "/";
          return url.href;
        })
        .get()
    )
  ];
}

export function pendingUrls(records, state) {
  return records.filter(({ url, hash }) => state[url]?.hash !== hash);
}
