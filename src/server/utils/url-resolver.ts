/**
 * URL Resolver Utility
 *
 * Resolves redirect URLs to their final destinations.
 * Handles Google Search grounding redirect URLs like:
 * vertexaisearch.cloud.google.com/grounding-api-redirect/...
 */

/**
 * Resolve a redirect URL to its final destination
 * @param url The URL to resolve (may be a redirect)
 * @returns The final destination URL
 */
export async function resolveRedirectUrl(url: string): Promise<string> {
  // Check if this is a Google grounding redirect URL
  if (url.includes('vertexaisearch.cloud.google.com/grounding-api-redirect')) {
    try {
      console.log(`[URL Resolver] Resolving redirect: ${url.substring(0, 80)}...`);

      // Follow the redirect with HEAD request (faster than GET)
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'manual', // Don't auto-follow, we want to see the Location header
      });

      const location = response.headers.get('Location');
      if (location) {
        console.log(`[URL Resolver] Resolved to: ${location}`);
        return location;
      }

      // If no Location header, try GET request
      const getResponse = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
      });

      const finalUrl = getResponse.url;
      console.log(`[URL Resolver] Final URL: ${finalUrl}`);
      return finalUrl;
    } catch (error) {
      console.error(`[URL Resolver] Error resolving redirect:`, error);
      // Return original URL if resolution fails
      return url;
    }
  }

  // Not a redirect URL, return as-is
  return url;
}

/**
 * Resolve multiple URLs in parallel
 * @param urls Array of URLs to resolve
 * @returns Array of resolved URLs
 */
export async function resolveRedirectUrls(urls: string[]): Promise<string[]> {
  const promises = urls.map(url => resolveRedirectUrl(url));
  return Promise.all(promises);
}

/**
 * Extract clean domain from any URL
 * @param url The URL to clean
 * @returns Clean domain (e.g., "doordash.com")
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch (error) {
    return url;
  }
}
