import { toRepoRelative } from './app-config.js';
import { type FeatureMapModel, routeRef, unroutedKeys } from './model.js';

export function checkExpoRoutes(model: FeatureMapModel): string[] {
  if (!model.config.expoRouter) return [];
  const objectName = model.config.routeUrlsObjectName;
  const routesFile = toRepoRelative(model.config.routeUrlsFile);
  const appDir = toRepoRelative(model.config.expoRouter.appDir);
  const errors: string[] = [];
  for (const route of model.router.routes) {
    if (route.keys.length > 0) continue;
    errors.push(
      [
        `screen ${toRepoRelative(route.file)} ('${route.mountedPath}') has no ${objectName} key.`,
        `Fix: add a key with the value '${route.mountedPath}' to ${objectName} in ${routesFile}, then claim it from an entry.`,
      ].join('\n')
    );
  }
  for (const key of unroutedKeys(model)) {
    errors.push(
      [
        `${routeRef(model, key)} ('${model.routeUrls.get(key) ?? ''}') matches no screen file under ${appDir}.`,
        `Fix: remove the key from ${routesFile} or correct its value to the screen's path.`,
      ].join('\n')
    );
  }
  return errors;
}
