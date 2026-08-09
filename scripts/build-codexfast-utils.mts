const supportedAppVersionsDeclarationPattern =
  /declare const __SUPPORTED_APP_VERSIONS__: Record<string, string>;\r?\n\r?\nconst SUPPORTED_APP_VERSIONS = __SUPPORTED_APP_VERSIONS__;/gu;

export function inlineSupportedAppVersions(
  source: string,
  supportedAppVersions: Record<string, string>,
): string {
  const matches = source.match(supportedAppVersionsDeclarationPattern) ?? [];
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one supported-app-versions declaration block, found ${matches.length}.`,
    );
  }
  return source.replace(
    supportedAppVersionsDeclarationPattern,
    () =>
      `const SUPPORTED_APP_VERSIONS = ${JSON.stringify(supportedAppVersions)};`,
  );
}

export function normalizeLineEndings(source: string): string {
  return source.replace(/\r\n?/gu, "\n");
}

export function assertDistributionEntrypoint(source: string): void {
  if (!source.startsWith("#!/usr/bin/env node\n")) {
    throw new Error(
      "bin/codexfast must start with an LF-terminated #!/usr/bin/env node shebang.",
    );
  }
  if (source.includes("\r")) {
    throw new Error("bin/codexfast must use LF line endings only.");
  }
}
