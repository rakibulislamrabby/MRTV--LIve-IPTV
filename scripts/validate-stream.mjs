const DEFAULT_TIMEOUT_MS = 9000;
const DEFAULT_CONCURRENCY = 14;

function isHlsUrl(url) {
  return /\.m3u8?(\?|$)/i.test(url) || url.includes(".m3u8");
}

async function probeStream(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "*/*",
      },
      redirect: "follow",
    });

    if (!response.ok) return false;

    if (isHlsUrl(url)) {
      const text = (await response.text()).slice(0, 4096);
      return (
        text.includes("#EXTM3U") ||
        text.includes("#EXTINF") ||
        text.includes("#EXT-X-STREAM-INF")
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    return (
      contentType.includes("video") ||
      contentType.includes("mpegurl") ||
      contentType.includes("octet-stream")
    );
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function runPool(items, worker, concurrency) {
  const results = new Array(items.length);
  let index = 0;

  async function consume() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current], current);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, consume),
  );

  return results;
}

export async function filterWorkingChannels(channels, options = {}) {
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
  const cache = new Map();
  const uniqueUrls = [...new Set(channels.map((channel) => channel.url))];

  process.stdout.write(
    `Checking ${uniqueUrls.length} stream URLs (${concurrency} at a time)…\n`,
  );

  let checked = 0;
  const workingUrls = new Set();

  await runPool(
    uniqueUrls,
    async (url) => {
      const ok = await probeStream(url);
      if (ok) workingUrls.add(url);
      checked += 1;
      if (checked % 25 === 0 || checked === uniqueUrls.length) {
        process.stdout.write(`  validated ${checked}/${uniqueUrls.length}\r`);
      }
    },
    concurrency,
  );

  process.stdout.write("\n");

  const working = channels.filter((channel) => workingUrls.has(channel.url));
  console.log(
    `  ${working.length}/${channels.length} channels passed stream check`,
  );

  return working;
}
