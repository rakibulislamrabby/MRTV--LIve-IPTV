import { IptvApp } from "@/components/IptvApp";
import { getChannels } from "@/lib/channels";

export default function Home() {
  const channels = getChannels();

  return <IptvApp channels={channels} />;
}
