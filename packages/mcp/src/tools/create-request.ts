import { type McpContext } from '../context';
import { type CreateRequestInput } from '../requests/pending-request-store';
import { presentRequest } from '../requests/request-presenter';
import { McpToolError, toolResult } from './tool-result';

export function createRequestResult(
  { requestStore, baseUrl }: Pick<McpContext, 'requestStore' | 'baseUrl'>,
  input: CreateRequestInput
) {
  const created = requestStore.create(input);
  if (!created.ok) {
    const { data } = presentRequest(created.inFlight, baseUrl);
    throw new McpToolError(
      'REQUEST_IN_FLIGHT',
      `Another ${input.requestClass} request is still open.`,
      'Only one request of this kind can be open at a time. Ask the user to finish the open request at its url, wait for it with check_request, or cancel it with cancel_request before proposing a new one.',
      { inFlightRequest: data }
    );
  }
  const { data, instructions } = presentRequest(created.request, baseUrl);
  return toolResult(data, instructions);
}
