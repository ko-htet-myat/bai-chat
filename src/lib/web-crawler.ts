const STRIP_BLOCKS_REGEX =
  /<(script|style|noscript|svg|iframe)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi;
const TITLE_REGEX = /<title[^>]*>(.*?)<\/title>/i;
const LINK_REGEX = /<a\s[^>]*href=(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;
const SCRIPT_SRC_REGEX = /<script\b[^>]*src=(?:"([^"]+)"|'([^']+)')[^>]*><\/script>/gi;
const IMAGE_SRC_REGEX = /<img\b[^>]*src=(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;
const META_DESCRIPTION_REGEX =
  /<meta[^>]+name=(?:"description"|'description')[^>]+content=(?:"([^"]*)"|'([^']*)')/i;
const META_IMAGE_REGEX =
  /<meta[^>]+(?:property|name)=(?:"(?:og:image|twitter:image)"|'(?:og:image|twitter:image)')[^>]+content=(?:"([^"]*)"|'([^']*)')/gi;
const XML_LOC_REGEX = /<loc>(.*?)<\/loc>/gi;
const ROBOTS_SITEMAP_REGEX = /^\s*Sitemap:\s*(.+)\s*$/gim;

export type CrawlWebsiteOptions = {
  maxPages?: number;
};

export type CrawlWebsiteResult = {
  pages: Array<{
    imageUrls: string[];
    text: string;
    title: string;
    url: string;
  }>;
  text: string;
  visitedUrls: string[];
};

function htmlToText(html: string) {
  return html
    .replace(STRIP_BLOCKS_REGEX, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function getTitle(html: string, fallbackUrl: string) {
  return html.match(TITLE_REGEX)?.[1]?.trim() || fallbackUrl;
}

function getMetaDescription(html: string) {
  return html.match(META_DESCRIPTION_REGEX)?.[1]?.trim() || html.match(META_DESCRIPTION_REGEX)?.[2]?.trim() || "";
}

function extractScriptSources(html: string, currentUrl: string, origin: string) {
  const scripts: string[] = [];

  for (const match of html.matchAll(SCRIPT_SRC_REGEX)) {
    const src = match[1] || match[2];
    if (!src) continue;

    try {
      const resolvedUrl = new URL(src, currentUrl);
      if (resolvedUrl.origin !== origin) continue;
      scripts.push(normalizeUrl(resolvedUrl));
    } catch {
      continue;
    }
  }

  return scripts;
}

function extractImageUrls(html: string, currentUrl: string) {
  const images = new Set<string>();
  const patterns = [IMAGE_SRC_REGEX, META_IMAGE_REGEX];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const src = match[1] || match[2] || match[3];
      if (!src || src.startsWith("data:")) continue;

      try {
        const resolvedUrl = new URL(src, currentUrl);
        if (!/^https?:$/.test(resolvedUrl.protocol)) continue;
        images.add(normalizeUrl(resolvedUrl));
      } catch {
        continue;
      }
    }
  }

  return [...images].slice(0, 8);
}

function shouldVisit(url: URL, origin: string) {
  if (url.origin !== origin) return false;
  if (!/^https?:$/.test(url.protocol)) return false;

  url.hash = "";

  return !/\.(pdf|png|jpg|jpeg|gif|svg|webp|zip|doc|docx|xls|xlsx|ppt|pptx)$/i.test(
    url.pathname.toLowerCase()
  );
}

function extractLinks(html: string, currentUrl: string, origin: string) {
  const links: string[] = [];

  for (const match of html.matchAll(LINK_REGEX)) {
    const href = match[1] || match[2] || match[3];
    if (
      !href ||
      href.startsWith("#") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      href.startsWith("javascript:")
    ) {
      continue;
    }

    try {
      const resolvedUrl = new URL(href, currentUrl);
      if (!shouldVisit(resolvedUrl, origin)) continue;
      links.push(resolvedUrl.toString());
    } catch {
      continue;
    }
  }

  return links;
}

function normalizeUrl(url: URL) {
  url.hash = "";

  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  return url.toString();
}

function decodeJsString(value: string) {
  return value
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\n/g, " ")
    .replace(/\\r/g, " ")
    .replace(/\\t/g, " ")
    .replace(/\\\\/g, "\\")
    .trim();
}

function isMeaningfulClientString(value: string) {
  if (value.length < 3 || value.length > 180) return false;
  if (/^(use strict|modulepreload|currentColor|noopener|noreferrer|true|false|null)$/i.test(value)) return false;
  if (/^[a-z_$][\w$.-]*$/i.test(value) && !/\s/.test(value) && !value.includes("http")) return false;
  if ((value.match(/[{}[\]<>]/g) || []).length > 2) return false;

  return /[a-zA-Z]/.test(value) && (/[\s:/.-]/.test(value) || value.includes("http"));
}

function extractBundleText(js: string) {
  const values = new Set<string>();
  const patterns = [
    /\b(?:children|title|description|href|label):"((?:[^"\\]|\\.)*)"/g,
    /\b(?:children|title|description|href|label):'((?:[^'\\]|\\.)*)'/g,
  ];

  for (const pattern of patterns) {
    for (const match of js.matchAll(pattern)) {
      const decoded = decodeJsString(match[1] || "");
      if (isMeaningfulClientString(decoded)) {
        values.add(decoded);
      }
    }
  }

  return [...values];
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "BAI-Chat-Knowledge-Crawler/1.0",
    },
  });

  if (!response.ok) return null;

  return {
    contentType: response.headers.get("content-type") || "",
    text: await response.text(),
  };
}

async function extractSpaFallbackText(html: string, currentUrl: string, origin: string) {
  const scriptUrls = extractScriptSources(html, currentUrl, origin).slice(0, 3);
  const collected = new Set<string>();

  for (const scriptUrl of scriptUrls) {
    const script = await fetchText(scriptUrl);
    if (!script?.contentType.includes("javascript")) continue;

    for (const value of extractBundleText(script.text)) {
      collected.add(value);
      if (collected.size >= 120) break;
    }

    if (collected.size >= 120) break;
  }

  return [...collected].join("\n");
}

function buildPageText(parts: {
  bodyText: string;
  imageUrls: string[];
  metaDescription: string;
  spaFallbackText: string;
}) {
  const contentSections = [
    parts.bodyText,
    parts.metaDescription,
    parts.spaFallbackText,
    parts.imageUrls.length > 0
      ? `Related images:\n${parts.imageUrls.map((url) => `- ${url}`).join("\n")}`
      : "",
  ].filter(Boolean);

  return contentSections.join("\n").trim();
}

function extractUrlsFromXml(xml: string, origin: string) {
  const urls: string[] = [];

  for (const match of xml.matchAll(XML_LOC_REGEX)) {
    const rawUrl = match[1]?.trim();
    if (!rawUrl) continue;

    try {
      const parsed = new URL(rawUrl);
      if (parsed.origin !== origin) continue;
      urls.push(normalizeUrl(parsed));
    } catch {
      continue;
    }
  }

  return urls;
}

async function discoverSitemapUrls(rootUrl: URL, maxPages: number) {
  const origin = rootUrl.origin;
  const sitemapCandidates = new Set<string>([
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
  ]);
  const discoveredUrls: string[] = [];
  const visitedSitemaps = new Set<string>();

  const robots = await fetchText(`${origin}/robots.txt`);
  if (robots?.text) {
    for (const match of robots.text.matchAll(ROBOTS_SITEMAP_REGEX)) {
      const sitemapUrl = match[1]?.trim();
      if (sitemapUrl) sitemapCandidates.add(sitemapUrl);
    }
  }

  const sitemapQueue = [...sitemapCandidates];

  while (sitemapQueue.length > 0 && discoveredUrls.length < maxPages * 4) {
    const sitemapUrl = sitemapQueue.shift();
    if (!sitemapUrl || visitedSitemaps.has(sitemapUrl)) continue;
    visitedSitemaps.add(sitemapUrl);

    const sitemap = await fetchText(sitemapUrl);
    if (!sitemap?.contentType.includes("xml")) continue;

    const urls = extractUrlsFromXml(sitemap.text, origin);
    for (const url of urls) {
      if (url.endsWith(".xml")) {
        if (!visitedSitemaps.has(url)) {
          sitemapQueue.push(url);
        }
        continue;
      }

      if (!discoveredUrls.includes(url)) {
        discoveredUrls.push(url);
      }
    }
  }

  return discoveredUrls;
}

export async function crawlWebsite(
  startUrl: string,
  options: CrawlWebsiteOptions = {}
): Promise<CrawlWebsiteResult> {
  const maxPages = Math.max(1, Math.min(options.maxPages ?? 10, 25));
  const rootUrl = new URL(startUrl);
  const queue = [normalizeUrl(rootUrl), ...(await discoverSitemapUrls(rootUrl, maxPages))];
  const visited = new Set<string>();
  const pages: CrawlWebsiteResult["pages"] = [];

  while (queue.length > 0 && pages.length < maxPages) {
    const currentUrl = queue.shift();
    if (!currentUrl || visited.has(currentUrl)) continue;
    visited.add(currentUrl);

    const response = await fetchText(currentUrl);
    if (!response) continue;

    const contentType = response.contentType;
    if (!contentType.includes("text/html")) continue;

    const html = response.text;
    const text = htmlToText(html);
    const metaDescription = getMetaDescription(html);
    const imageUrls = extractImageUrls(html, currentUrl);
    const spaFallbackText =
      text.length >= 120 ? "" : await extractSpaFallbackText(html, currentUrl, rootUrl.origin);
    const bestText = buildPageText({
      bodyText: text,
      imageUrls,
      metaDescription,
      spaFallbackText,
    });
    if (!bestText) continue;

    pages.push({
      imageUrls,
      title: getTitle(html, currentUrl),
      text: bestText,
      url: currentUrl,
    });

    const nextLinks = extractLinks(html, currentUrl, rootUrl.origin);
    for (const nextLink of nextLinks) {
      const normalizedNextLink = normalizeUrl(new URL(nextLink));
      if (!visited.has(normalizedNextLink) && !queue.includes(normalizedNextLink) && queue.length < maxPages * 4) {
        queue.push(normalizedNextLink);
      }
    }
  }

  return {
    pages,
    text: pages
      .map((page) => `Page: ${page.title}\nURL: ${page.url}\n\n${page.text}`)
      .join("\n\n---\n\n"),
    visitedUrls: pages.map((page) => page.url),
  };
}
