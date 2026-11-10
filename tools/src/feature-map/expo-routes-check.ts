import { toRepoRelative } from './app-config.js';
import { type FeatureMapModel, routeRef } from './model.js';

export function checkExpoRoutes(model: FeatureMapModel): string[] {
  const { expoRouter } = model.config;
  if (!expoRouter) return [];
  const errors: string[] = [];
  const routeUrlsFile = toRepoRelative(model.config.routeUrlsFile);
  const objectName = model.config.routeUrlsObjectName;
  for (const route of model.router.routes) {
    if (route.keys.length > 0) continue;
    errors.push(
      [
        `screen ${toRepoRelative(route.file)} mounts '${route.mountedPath}' but no ${objectName} key has that value.`,
        `Fix: add a key with the value '${route.mountedPath}' to ${objectName} in ${routeUrlsFile}, then claim it from an entry.`,
      ].join('\n')
    );
  }
  for (const [key, value] of model.routeUrls) {
    if (model.router.references.has(key)) continue;
    errors.push(
      [
        `${routeRef(model, key)} ('${value}') in ${routeUrlsFile} matches no screen file under ${toRepoRelative(expoRouter.appDir)}.`,
        `Fix: correct the value to the path of an existing screen or remove the key.`,
      ].join('\n')
    );
  }
  return errors;
}
