import { toRepoRelative } from './app-config.js';
import { type RouterModel } from './routers-parser.js';

interface ExpoRoutesCheckInput {
  readonly routeUrlsFile: string;
  readonly routeUrlsObjectName: string;
  readonly routeUrls: ReadonlyMap<string, string>;
  readonly router: RouterModel;
}

export function checkExpoRoutes({
  routeUrlsFile,
  routeUrlsObjectName,
  routeUrls,
  router,
}: ExpoRoutesCheckInput): string[] {
  const errors: string[] = [];
  const keysFile = toRepoRelative(routeUrlsFile);
  for (const route of router.routes) {
    if (route.keys.length > 0) continue;
    errors.push(
      [
        `screen ${toRepoRelative(route.file)} ('${route.mountedPath}') has no ${routeUrlsObjectName} key.`,
        `Fix: add a key with the value '${route.mountedPath}' to ${routeUrlsObjectName} in ${keysFile}, then claim it from an entry.`,
      ].join('\n')
    );
  }
  for (const [key, value] of routeUrls) {
    if (router.references.has(key)) continue;
    errors.push(
      [
        `${routeUrlsObjectName}.${key} ('${value}') in ${keysFile} matches no screen file.`,
        `Fix: rename it to the path of an expo-router screen or remove it.`,
      ].join('\n')
    );
  }
  return errors;
}
