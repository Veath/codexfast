export function fail(message: string, detail?: string): never {
  console.error(message);
  if (detail) {
    console.error(detail);
  }
  process.exit(1);
}

export function assertContains(source: string, expected: string | RegExp, message: string, detail = source): void {
  const matches = typeof expected === "string" ? source.includes(expected) : expected.test(source);
  if (!matches) {
    fail(message, detail);
  }
}

export function assertNotContains(source: string, unexpected: string | RegExp, message: string, detail = source): void {
  const matches = typeof unexpected === "string" ? source.includes(unexpected) : unexpected.test(source);
  if (matches) {
    fail(message, detail);
  }
}
