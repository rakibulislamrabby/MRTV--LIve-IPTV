import { IptvApp } from "@/components/IptvApp";
import { getChannels } from "@/lib/channels";

export const dynamic = "force-static";

export default function Home() {
  const channels = getChannels();

  return <IptvApp channels={channels} />;
}
