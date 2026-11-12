import { program } from 'commander';

import {
  registerBotBranchSecretGuardCommands,
  registerChangelogCommands,
  registerFeatureMapCommands,
  registerFixIssueCommands,
  registerVerifyCommands,
} from './commands/index.js';

program.name('lt').description('Leather monorepo tools').version('1.0.0');

registerChangelogCommands(program);
registerFeatureMapCommands(program);
registerVerifyCommands(program);
registerFixIssueCommands(program);
registerBotBranchSecretGuardCommands(program);

await program.parseAsync();
