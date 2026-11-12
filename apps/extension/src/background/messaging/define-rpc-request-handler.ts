import type { RpcEndpointMap, RpcRequests } from '@leather.io/rpc';

export type RequestSender = Pick<chrome.runtime.Port, 'sender'>;

export type RpcHandler<T> = (request: T, port: RequestSender) => Promise<void> | void;

export function defineRpcRequestHandler<M extends RpcRequests['method']>(
  method: M,
  handler: RpcHandler<RpcEndpointMap[M]['request']>
) {
  return [method, handler] as const;
}
