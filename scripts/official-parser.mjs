import { cachedGet } from "./lib/source-cache.mjs";
const fetch = (url, init) => globalThis.fetch(url, { ...init, signal: AbortSignal.timeout(20000) });
import { hasExplicitNonMoscowRegion, isKnownTechnicalMoscowCenterCoordinate } from "../src/features/temples/geo-quality.ts";
const BASE_URL = "https://sprav.moseparh.ru";
const LIST_URL = `${BASE_URL}/monasteries`;
const TEXT_LIMIT = 3500;
function decodeHtml(value) {
    const named = {
        amp: "&",
        quot: "\"",
        apos: "'",
        nbsp: " ",
        laquo: "«",
        raquo: "»",
        mdash: "—",
        ndash: "–"
    };
    return value
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
        .replace(/&([a-z]+);/gi, (_, code) => named[code] ?? " ")
        .replace(/\s+/g, " ")
        .trim();
}
function stripHtml(value) {
    return decodeHtml(value
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<[^>]+>/g, " "));
}
function trimText(value, limit = TEXT_LIMIT) {
    if (!value) {
        return undefined;
    }
    const normalized = value.replace(/\s+/g, " ").trim();
    return normalized.length > limit ? `${normalized.slice(0, limit - 1).trim()}…` : normalized;
}
export function slugify(value) {
    const map = {
        а: "a",
        б: "b",
        в: "v",
        г: "g",
        д: "d",
        е: "e",
        ё: "e",
        ж: "zh",
        з: "z",
        и: "i",
        й: "y",
        к: "k",
        л: "l",
        м: "m",
        н: "n",
        о: "o",
        п: "p",
        р: "r",
        с: "s",
        т: "t",
        у: "u",
        ф: "f",
        х: "h",
        ц: "ts",
        ч: "ch",
        ш: "sh",
        щ: "sch",
        ъ: "",
        ы: "y",
        ь: "",
        э: "e",
        ю: "yu",
        я: "ya"
    };
    return value
        .toLocaleLowerCase("ru-RU")
        .split("")
        .map((char) => map[char] ?? char)
        .join("")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 72);
}
export function isMoscowAddress(address) {
    if (!address) {
        return false;
    }
    const normalized = address.toLocaleLowerCase("ru-RU");
    if (hasExplicitNonMoscowRegion(normalized)) {
        return false;
    }
    return (/(?:^|[,;\s])(?:г(?:ород)?\.?\s*)?москва(?:[,;\s]|$)/u.test(normalized) ||
        /(?:^|[,;\s])г\.?\s*(?:зеленоград|троицк|щербинка|московский)(?:[,;\s]|$)/u.test(normalized) ||
        /(?:^|[,;\s])(?:пос\.?|п\.?|район)\s*(?:сосенское|десеновское|внуково|кокошкино|вороново|кленовское|краснопахорское|марушкинское|мосрентген|роговское|рязановское|филимонковское|щаповское|коммунарка)(?:[,;\s]|$)/u.test(normalized) ||
        /\b(?:тинао|новомосковский\s+округ|троицкий\s+ао)\b/u.test(normalized));
}
function splitAffiliation(value) {
    const parts = value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
    const vicariate = parts.find((item) => /викариатство/i.test(item));
    const deanery = parts.find((item) => /благочиние/i.test(item));
    return { vicariate, deanery };
}
async function fetchSession() {
    const response = await fetch(LIST_URL);
    const html = await response.text();
    const token = html.match(/<meta name="csrf-token" content="([^"]+)"/)?.[1];
    const cookie = (response.headers.get("set-cookie") ?? "")
        .split(/,(?=\s*[^;]+=)/)
        .map((item) => item.split(";")[0])
        .join("; ");
    if (!token) {
        throw new Error("Cannot get sprav.moseparh.ru CSRF token");
    }
    return { token, cookie };
}
export async function fetchList(area) {
    const session = await fetchSession();
    const response = await fetch(`${LIST_URL}?`, {
        method: "POST",
        headers: {
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            "x-csrf-token": session.token,
            "x-requested-with": "XMLHttpRequest",
            cookie: session.cookie
        },
        body: new URLSearchParams({ query: "", area, parent_id: "" })
    });
    const html = await response.text();
    const items = [];
    for (const match of html.matchAll(/<tr>[\s\S]*?<\/tr>/g)) {
        const row = match[0];
        const urlMatch = row.match(/href="(https:\/\/sprav\.moseparh\.ru\/org\/(\d+))"/);
        if (!urlMatch) {
            continue;
        }
        const objectType = stripHtml(row.match(/<td class="first min">([\s\S]*?)<\/td>/)?.[1] ?? "");
        const linkText = stripHtml(row.match(/<a href="https:\/\/sprav\.moseparh\.ru\/org\/\d+">([\s\S]*?)<\/a>/)?.[1] ?? "");
        const address = stripHtml(row.match(/Адрес:\s*([^<]+)/)?.[1] ?? "");
        const smallBlocks = [...row.matchAll(/<div class="small grey">([\s\S]*?)<\/div>/g)].map((item) => stripHtml(item[1]));
        const affiliation = smallBlocks.find((item) => /викариатство|благочиние/i.test(item));
        items.push({
            officialId: urlMatch[2],
            url: urlMatch[1],
            objectType,
            name: linkText,
            address,
            affiliation,
            area
        });
    }
    return items;
}
function getRows(html) {
    const rows = new Map();
    for (const match of html.matchAll(/<tr[\s\S]*?<strong>([\s\S]*?)<\/strong>[\s\S]*?<td class="last"[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/g)) {
        rows.set(stripHtml(match[1]), match[2]);
    }
    return rows;
}
function parseContacts(html) {
    const contactHtml = html.match(/<div class="item-contacts">([\s\S]*?)<\/div>\s*<!-- end \.item-contacts-->/)?.[1] ?? "";
    const contactText = stripHtml(contactHtml);
    const addressHtml = contactHtml.match(/<div class="text">([\s\S]*?)(?:<br\s*\/?>|<a href="tel:|<a href="https?:|<a href="mailto:)/i)?.[1];
    const phone = decodeHtml(contactHtml.match(/href="tel:([^"]+)"/)?.[1] ?? "");
    const email = decodeHtml(contactHtml.match(/href="mailto:([^"]+)"/)?.[1] ?? "");
    const websiteUrl = [...contactHtml.matchAll(/href="(https?:\/\/[^"]+)"/g)]
        .map((item) => item[1])
        .find((url) => !url.includes("vk.com") && !url.includes("t.me") && !url.includes("youtube.com") && !url.includes("sprav.moseparh.ru"));
    const address = stripHtml(addressHtml ?? "") ||
        contactText
            .split(/\n|(?=\+7)|(?=https?:\/\/)|(?=[\w.-]+@)/)
            .map((item) => item.trim())
            .find((item) => isMoscowAddress(item));
    const socialLinks = [...contactHtml.matchAll(/href="(https?:\/\/[^"]+)"/g)]
        .map((item) => item[1])
        .filter((url) => /vk\.com|t\.me|telegram|youtube|rutube/i.test(url))
        .map((url) => ({
        url,
        label: url.includes("vk.com") ? "VK" : url.includes("youtube") ? "YouTube" : "Соцсеть",
        type: url.includes("vk.com") ? "vk" : url.includes("youtube") ? "youtube" : "other"
    }));
    return { address, phone, email, websiteUrl, socialLinks };
}
function parseClergy(value) {
    if (!value) {
        return [];
    }
    return value
        .split(/(?=(?:Иерей|Протоиерей|Диакон|Протодиакон|Священник|Иеромонах|Архимандрит|Епископ)\s)/)
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => {
        const rank = item.match(/^(Иерей|Протоиерей|Диакон|Протодиакон|Священник|Иеромонах|Архимандрит|Епископ)\b/)?.[1];
        return {
            name: item,
            rank,
            role: "Духовенство"
        };
    });
}
export function inferServices(activity) {
    const services = [];
    const text = activity ?? "";
    const add = (kind, title, pattern) => {
        if (pattern.test(text)) {
            services.push({
                kind,
                title,
                description: trimText(text, 700) ?? title
            });
        }
    };
    add("sundaySchool", "Воскресная школа", /воскресн/i);
    add("youth", "Молодежное служение", /молод[её]ж/i);
    add("social", "Социальное служение", /социаль|помощ|милосерд/i);
    add("choir", "Хор", /хор|певч/i);
    add("meetings", "Приходские встречи", /встреч|лектори|бесед|катехиз/i);
    add("pilgrimage", "Паломничество", /паломнич/i);
    return services;
}
export async function fetchDetail(item) {
    const html = (await cachedGet(item.url)).body;
    const rows = getRows(html);
    const contacts = parseContacts(html);
    const h1 = stripHtml(html.match(/<h1>([\s\S]*?)<\/h1>/)?.[1] ?? item.name);
    const affiliation = stripHtml(rows.get("Принадлежность") ?? "") || item.affiliation;
    const { vicariate, deanery } = splitAffiliation(affiliation);
    const rectorName = stripHtml(rows.get("Настоятель") ?? "") || undefined;
    const clergy = parseClergy(stripHtml(rows.get("Духовенство") ?? ""));
    const scheduleSummary = trimText(stripHtml(rows.get("Богослужения") ?? ""));
    const historySummary = trimText(stripHtml(rows.get("История") ?? ""));
    const activitySummary = trimText(stripHtml(rows.get("Деятельность") ?? ""));
    const shrines = trimText(stripHtml(rows.get("Святыни") ?? rows.get("Престольный праздник") ?? ""));
    const coords = stripHtml(rows.get("Координаты для навигации") ?? "").match(/(5[5-6]\.\d+)\s*,\s*(3[6-8]\.\d+)/);
    const sourceLatitude = coords ? Number(coords[1]) : undefined;
    const sourceLongitude = coords ? Number(coords[2]) : undefined;
    const hasTechnicalCoordinates = isKnownTechnicalMoscowCenterCoordinate(sourceLatitude, sourceLongitude);
    const photoSrc = html.match(/<img src="(\/uploads\/organisations\/[^"]+)"/)?.[1];
    const rawText = trimText(stripHtml(html), 9000) ?? "";
    return {
        officialId: item.officialId,
        url: item.url,
        name: h1,
        shortName: item.name || h1,
        objectType: item.objectType,
        address: contacts.address || item.address,
        phone: contacts.phone || undefined,
        email: contacts.email || undefined,
        websiteUrl: contacts.websiteUrl,
        affiliation,
        vicariate,
        deanery,
        rectorName,
        clergy,
        scheduleSummary,
        historySummary,
        activitySummary,
        shrines,
        latitude: hasTechnicalCoordinates ? undefined : sourceLatitude,
        longitude: hasTechnicalCoordinates ? undefined : sourceLongitude,
        photoUrl: photoSrc ? `${BASE_URL}${photoSrc}` : undefined,
        socialLinks: contacts.socialLinks,
        rawText
    };
}

