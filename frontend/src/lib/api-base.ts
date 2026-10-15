const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

function hostnameOf(value: string): string | null {
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

/**
 * The API URL is compiled into the frontend. A production image built with the
 * local default still points at the viewer's own machine. When that happens,
 * call port 4000 on the host that served the page.
 */
export function resolveApiBaseUrl(pageOrigin: string, configured: string | undefined): string {
  const configuredUrl = configured?.trim() || "http://localhost:4000";
  const pageHost = hostnameOf(pageOrigin);
  const configuredHost = hostnameOf(configuredUrl);

  if (pageHost && configuredHost && !LOCAL_HOSTS.has(pageHost) && LOCAL_HOSTS.has(configuredHost)) {
    const page = new URL(pageOrigin);
    return `${page.protocol}//${page.hostname}:4000`;
  }

  return configuredUrl;
}
