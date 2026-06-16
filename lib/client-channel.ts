export interface ClientChannel {
  id: string;
  name: string;
  logo?: string;
  group: string;
  isFeatured?: boolean;
  hasBackup?: boolean;
}

export function getStreamPath(channelId: string, backup = false): string {
  const params = new URLSearchParams({ id: channelId });
  if (backup) params.set("fb", "1");
  return `/api/stream?${params.toString()}`;
}
