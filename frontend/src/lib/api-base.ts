const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

function hostnameOf(value: string): string | null {
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

/**
 * Base URL placed before /alerts, /monitor, and /settings.
 * An empty string keeps the request on the page origin. Frontend Nginx proxies
 * those paths to the backend, so the browser does not open port 4000 itself.
 */
export function resolveApiBaseUrl(pageOrigin: string, configured: string | undefined): string {
  const pageHost = hostnameOf(pageOrigin);
  const pageIsLocal = pageHost === null || LOCAL_HOSTS.has(pageHost);
  const configuredUrl = configured?.trim() ?? "";

  if (!configuredUrl) {
    return pageIsLocal ? "http://localhost:4000" : "";
  }

  const configuredHost = hostnameOf(configuredUrl);
  if (!configuredHost) {
    return configuredUrl;
  }

  const configuredIsLocal = LOCAL_HOSTS.has(configuredHost);
  if (!pageIsLocal && (configuredIsLocal || configuredHost === pageHost)) {
    return "";
  }

  return configuredUrl;
}
