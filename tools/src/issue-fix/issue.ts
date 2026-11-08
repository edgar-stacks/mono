import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

import { type GitHubClient, GitHubError, paginate } from './github.js';

const userSchema = z.object({ login: z.string() }).nullable();

const issueSchema = z.object({
  title: z.string(),
  html_url: z.string(),
  state: z.string(),
  body: z.string().nullable(),
  created_at: z.string(),
  user: userSchema,
  labels: z.array(z.union([z.string(), z.object({ name: z.string() })])),
  pull_request: z.unknown().optional(),
});

const commentSchema = z.object({
  body: z.string().nullable(),
  created_at: z.string(),
  user: userSchema,
});

type Issue = z.infer<typeof issueSchema>;
type Comment = z.infer<typeof commentSchema>;

function text(value: string | null): string {
  return value === null || value === '' ? '(empty)' : value;
}

function login(user: Issue['user']): string {
  return user?.login ?? 'ghost';
}

function renderIssue(issue: Issue, comments: readonly Comment[]): string {
  const labels = issue.labels.map(label => (typeof label === 'string' ? label : label.name));
  const renderedComments =
    comments.length === 0
      ? 'none'
      : comments
          .map(
            comment =>
              `### @${login(comment.user)} on ${comment.created_at}\n\n${text(comment.body)}`
          )
          .join('\n\n');
  return [
    `# ${issue.title}`,
    '',
    issue.html_url,
    '',
    `Labels: ${labels.length === 0 ? 'none' : labels.join(', ')}`,
    `Opened by @${login(issue.user)} on ${issue.created_at}`,
    '',
    '## Body',
    '',
    text(issue.body),
    '',
    '## Comments',
    '',
    renderedComments,
    '',
  ].join('\n');
}

interface FetchIssueOptions {
  readonly client: GitHubClient;
  readonly repo: string;
  readonly issue: number;
  readonly outFile: string;
}

export async function fetchIssue({
  client,
  repo,
  issue,
  outFile,
}: FetchIssueOptions): Promise<number> {
  let raw: unknown;
  try {
    raw = await client.request('GET', `repos/${repo}/issues/${issue}`);
  } catch (error) {
    if (error instanceof GitHubError && error.status === 404) {
      throw new Error(`issue #${issue} was not found in ${repo}`);
    }
    throw error;
  }
  const parsed = issueSchema.parse(raw);
  if (parsed.pull_request !== undefined)
    throw new Error(`#${issue} is a pull request, not an issue`);
  if (parsed.state !== 'open') throw new Error(`issue #${issue} is closed`);
  const comments = z
    .array(commentSchema)
    .parse(await paginate(client, `repos/${repo}/issues/${issue}/comments`));
  mkdirSync(path.dirname(outFile), { recursive: true });
  writeFileSync(outFile, renderIssue(parsed, comments));
  return comments.length;
}
