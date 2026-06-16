export const FEATURED_STREAM_URL =
  "http://198.195.239.50:8095/tsports/tracks-v1a1/mono.m3u8";

export function isFeaturedStreamUrl(url) {
  return url === FEATURED_STREAM_URL;
}

export function pinFeaturedChannel(channels) {
  const index = channels.findIndex((channel) => isFeaturedStreamUrl(channel.url));
  if (index <= 0) return channels;

  const featured = channels[index];
  return [featured, ...channels.slice(0, index), ...channels.slice(index + 1)];
}
