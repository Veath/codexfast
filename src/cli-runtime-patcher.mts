import { asError, printLine } from "./cli-utils.mts";

export type RuntimePatchResult = {
  content: string;
  matchedLabels: string[];
  patchedLabels: string[];
  alreadyPatchedLabels: string[];
};

let runtimePatchBodyFunction:
  | ((resourcePath: string, body: string) => RuntimePatchResult)
  | null = null;

export function applyRuntimePatchesToResponseBodyWithSource(
  patcherSource: string,
  resourcePath: string,
  body: string,
): RuntimePatchResult {
  if (!runtimePatchBodyFunction) {
    const tailMarker = "\nlet exitCode = 1;\n";
    const tailIndex = patcherSource.lastIndexOf(tailMarker);
    if (tailIndex === -1) {
      throw new Error(
        "Embedded runtime patch engine entrypoint was not found.",
      );
    }
    const patcherMarkerIndexes = [
      '\nconst fs = require("node:fs");\n',
      '\nconst fs = require("fs");\n',
    ]
      .map((marker) => patcherSource.indexOf(marker))
      .filter((index) => index >= 0);
    const patcherIndex =
      patcherMarkerIndexes.length > 0 ? Math.min(...patcherMarkerIndexes) : -1;
    const engineEnd = patcherIndex === -1 ? tailIndex : patcherIndex;
    const engineSource = patcherSource.slice(0, engineEnd);
    const factory = new Function(
      `${engineSource}\nreturn applyRuntimePatchesToBody;`,
    ) as () => unknown;
    const candidate = factory();
    if (typeof candidate !== "function") {
      throw new Error("Embedded runtime patch engine is unavailable.");
    }
    runtimePatchBodyFunction = candidate as (
      resourcePath: string,
      body: string,
    ) => RuntimePatchResult;
  }
  return runtimePatchBodyFunction(resourcePath, body);
}

export function isRuntimeJavaScriptResource(resourceUrl: string): boolean {
  return /^app:\/\/[^?#]+\/(?:webview\/)?assets\/[^/?#]+\.js(?:[?#].*)?$/.test(
    resourceUrl,
  );
}

export function runRuntimeUrlSelfTest(): number {
  const acceptedUrls = [
    "app://-/assets/index-DxnGmFpS.js",
    "app://-/assets/index-DxnGmFpS.js?v=1",
    "app://-/webview/assets/index.js",
    "app://codex.local/webview/assets/chunk.js#hash",
  ];
  const rejectedUrls = [
    "app://-/index.html",
    "app://-/assets/style.css",
    "https://example.com/assets/index.js",
    "app://-/assets/nested/index.js",
  ];

  for (const url of acceptedUrls) {
    if (!isRuntimeJavaScriptResource(url)) {
      printLine(`Runtime URL self-test failed: expected accepted ${url}`);
      return 1;
    }
  }

  for (const url of rejectedUrls) {
    if (isRuntimeJavaScriptResource(url)) {
      printLine(`Runtime URL self-test failed: expected rejected ${url}`);
      return 1;
    }
  }

  printLine("Runtime URL self-test passed");
  return 0;
}

export function runRuntimePatchBodySourceSelfTest(patcherSource: string): number {
  const body =
    "settings.agent.speed.label;n=se(),{serviceTierSettings:r,setServiceTier:i}=fe();if(!n)return null;let o;";
  let result: RuntimePatchResult;
  try {
    result = applyRuntimePatchesToResponseBodyWithSource(
      patcherSource,
      "app://-/assets/general-settings-demo.js",
      body,
    );
  } catch (error) {
    printLine(`Runtime patch body self-test failed: ${asError(error).message}`);
    return 1;
  }

  if (
    !result.content.includes(
      "{serviceTierSettings:r,setServiceTier:i}=fe();let o;",
    ) ||
    !result.patchedLabels.includes("Speed setting")
  ) {
    printLine("Runtime patch body self-test failed");
    return 1;
  }

  printLine("Runtime patch body self-test passed");
  return 0;
}
