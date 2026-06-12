const STREAM_SECRET =
  process.env.STREAM_SECRET ?? "dofadar-stream-guard-v1";

function getKeyBytes(): Uint8Array {
  return new TextEncoder().encode(STREAM_SECRET);
}

export function encodeSecret(value: string): string {
  const bytes = new TextEncoder().encode(value);
  const key = getKeyBytes();
  const encoded = bytes.map((byte, index) => byte ^ key[index % key.length]!);
  return Buffer.from(encoded).toString("base64url");
}

export function decodeSecret(token: string): string {
  const bytes = Uint8Array.from(Buffer.from(token, "base64url"));
  const key = getKeyBytes();
  const decoded = bytes.map((byte, index) => byte ^ key[index % key.length]!);
  return new TextDecoder().decode(decoded);
}

export function isAllowedStreamUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
