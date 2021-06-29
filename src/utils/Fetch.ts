import { ReaderConfig } from "../navigator/IFrameNavigator";

export const initReaderFetch = (config: ReaderConfig) => (
  url: string,
  options?: RequestInit
): Promise<Response> => {
  if (typeof config.api.fetch === "function") {
    return config.api.fetch(url, options);
  }
  return window.fetch(url, options);
};
