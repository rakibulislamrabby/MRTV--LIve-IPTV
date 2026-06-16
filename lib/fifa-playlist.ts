import type { Channel } from "./types";

import { parseFifaPlaylistContent } from "./fifa-playlist.mjs";

export function parseFifaPlaylist(content: string): Channel[] {
  return parseFifaPlaylistContent(content) as Channel[];
}
