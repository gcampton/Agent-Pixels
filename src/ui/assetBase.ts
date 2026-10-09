// Where the plugin's UI assets are served from.
// The host serves plugin UI files by plugin id (/_plugins/<uuid>/ui/...), not by plugin key, and
// loads page modules from a blob: URL, so on company pages the id comes from /api/plugins.

export type CharacterAsset = { index: number; path: string; url: string };

export function assetBaseFromModuleUrl(metaUrl: string | undefined, pathname: string): string | null {
  if (metaUrl && !metaUrl.startsWith("blob:")) return new URL("./assets/", metaUrl).toString();
  const pluginMatch = pathname.match(/\/_plugins\/[^/]+\/ui\//);
  return pluginMatch ? `${pluginMatch[0]}assets/` : null;
}

export function assetBaseFromPluginList(body: unknown, pluginKey: string): string {
  const list = Array.isArray(body) ? body : (body as { plugins?: unknown } | null)?.plugins;
  const plugins = (Array.isArray(list) ? list : []) as Array<{ id?: string; pluginKey?: string }>;
  const self = plugins.find((plugin) => plugin.pluginKey === pluginKey);
  if (!self?.id) throw new Error(`Plugin ${pluginKey} not found in /api/plugins`);
  return `/_plugins/${encodeURIComponent(self.id)}/ui/assets/`;
}

export function characterAssetsFromIndex(baseUrl: string, characters: string[] | undefined): CharacterAsset[] {
  return (characters ?? []).map((path, index) => ({ index, path, url: `${baseUrl}${path}` }));
}
