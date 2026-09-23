import YouTubeProvider from "./YouTubeProvider.js";
import FacebookProvider from "./FacebookProvider.js";
import TikTokProvider from "./TikTokProvider.js";

const providers = [
  new YouTubeProvider(),
  new FacebookProvider(),
  new TikTokProvider(),
];

export function getProvider(url) {
  if (!url) return null;
  return providers.find(p => p.detect(url)) || null;
}

export { YouTubeProvider, FacebookProvider, TikTokProvider };
