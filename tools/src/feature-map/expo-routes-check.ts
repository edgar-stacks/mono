import { type FeatureMapAppConfig, toRepoRelative } from './app-config.js';
import { type RouterModel } from './routers-parser.js';

export function checkExpoRoutes(
  config: FeatureMapAppConfig,
  router: RouterModel,
  routeUrls: ReadonlyMap<string, string>
): string[] {
  const objectName = config.routeUrlsObjectName;
  const routeUrlsFile = toRepoRelative(config.routeUrlsFile);
  const errors: string[] = [];
  for (const route of router.routes) {
    if (route.keys.length > 0) continue;
    errors.push(
      [
        `screen ${toRepoRelative(route.file)} ('${route.path}') has no ${objectName} key.`,
        `Fix: add a key with the value '${route.path}' to ${objectName} in ${routeUrlsFile}, then claim it in an entry.`,
      ].join('\n')
    );
  }
  for (const [key, value] of routeUrls) {
    if (router.references.has(key)) continue;
    errors.push(
      [
        `${objectName}.${key} ('${value}') in ${routeUrlsFile} matches no screen file.`,
        `Fix: point it at the path of a screen under ${toRepoRelative(config.expoRouter?.appDir ?? config.appDir)} or remove it.`,
      ].join('\n')
    );
  }
  return errors;
}
