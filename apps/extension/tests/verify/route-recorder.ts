import type { BrowserContext, Page, Request, Route } from '@playwright/test';

import { type RouteOutcome, routeActions } from '@leather.io/tools/network-classification';

type RouteSource = RouteOutcome['source'];

export type RouteOutcomes = Map<Request, RouteOutcome>;

function trackRoute(route: Route, source: RouteSource, outcomes: RouteOutcomes): Route {
  return new Proxy(route, {
    get(target, property) {
      const value: unknown = Reflect.get(target, property);
      if (typeof value !== 'function') return value;
      const action = routeActions.find(item => item === property);
      return (...args: unknown[]) => {
        if (action) outcomes.set(target.request(), { source, action });
        const result: unknown = Reflect.apply(value, target, args);
        return result;
      };
    },
  });
}

export function recordRoutes<T extends Page | BrowserContext>(
  target: T,
  source: RouteSource,
  outcomes: RouteOutcomes
): T {
  return new Proxy(target, {
    get(object, property) {
      const value: unknown = Reflect.get(object, property);
      if (typeof value !== 'function') return value;
      if (property !== 'route') {
        const bound: unknown = value.bind(object);
        return bound;
      }
      return (url: unknown, handler: unknown, options?: unknown) => {
        const routeHandler = handler;
        function tracked(route: Route, request: Request) {
          if (typeof routeHandler !== 'function') return undefined;
          const handled: unknown = Reflect.apply(routeHandler, undefined, [
            trackRoute(route, source, outcomes),
            request,
          ]);
          return handled;
        }
        const registered: unknown = Reflect.apply(value, object, [
          url,
          typeof handler === 'function' ? tracked : handler,
          options,
        ]);
        return registered;
      };
    },
  });
}
