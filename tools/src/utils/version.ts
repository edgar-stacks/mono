import fs from 'node:fs';

export function readPackageVersion(packageJsonPath: string): string {
  const parsed: unknown = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('version' in parsed) ||
    typeof parsed.version !== 'string'
  ) {
    throw new Error(`${packageJsonPath} has no string "version" field`);
  }
  return parsed.version;
}

const nonNegativeIntegerPattern = /^\d+$/;

function parseVersionParts(version: string): number[] {
  const [release = ''] = version.replace(/^v/, '').split('-');
  return release.split('.').map(part => {
    if (!nonNegativeIntegerPattern.test(part)) {
      throw new Error(`Invalid version "${version}": "${part}" is not a number`);
    }
    return Number(part);
  });
}

function compareVersions(a: string, b: string): number {
  const partsA = parseVersionParts(a);
  const partsB = parseVersionParts(b);

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] ?? 0;
    const numB = partsB[i] ?? 0;
    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }
  return 0;
}

export function isVersionGreaterThan(version: string, threshold: string): boolean {
  return compareVersions(version, threshold) > 0;
}
