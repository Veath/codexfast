import { chmodSync, existsSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { assertContains, assertNotContains, fail } from "./helpers/assertions.mts";
import { assertFakeAsarJsParses, extractFakeAsar, readFakeAsarFile, readFakeAsarHeaderHash, writeFakeAsar } from "./helpers/fake-asar.mts";
import { type AssetProfile, prepareArchivedFakeApp as prepareArchivedFakeAppHelper, prepareLegacyFakeApp as prepareLegacyFakeAppHelper, readInfoPlistHash, writeInfoPlist } from "./helpers/fake-app.mts";
import { assertCodesignCallContains as assertCodesignCallContainsHelper, assertCodesignCalls as assertCodesignCallsHelper, assertNoTccutilCalls as assertNoTccutilCallsHelper, assertNpmCallContains as assertNpmCallContainsHelper, assertTccutilCallContains as assertTccutilCallContainsHelper, readOutput, resetCodesignCalls as resetCodesignCallsHelper, resetTccutilCalls as resetTccutilCallsHelper, runScript as runScriptHelper, setupStubs as setupStubsHelper } from "./helpers/script-harness.mts";


const rootDir = resolve(process.env.CODEXFAST_TEST_ROOT ?? process.cwd());
const tmpDir = mkdtempSync(join(tmpdir(), "codexfast-test."));
const stubBin = join(tmpDir, "bin");
const markerFile = join(tmpDir, "codesign.log");
const fixturesDir = join(rootDir, "test", "fixtures");

function setupStubs(): void {
  setupStubsHelper(stubBin, markerFile);
}

function prepareArchivedFakeApp(appDir: string, assetsRoot: string, appVersion = "26.415.40636", appBuild = "1799", assetProfile: AssetProfile = "standard"): void {
  prepareArchivedFakeAppHelper({ appDir, assetsRoot, fixturesDir, appVersion, appBuild, assetProfile });
}

function prepareLegacyFakeApp(appDir: string, unpackedAssetsDir: string, archivedAssetsRoot: string, appBuildHashPlaceholder: string): void {
  prepareLegacyFakeAppHelper({ appDir, unpackedAssetsDir, archivedAssetsRoot, fixturesDir, appBuildHashPlaceholder });
}

function runScript(appDir: string, input: string, outputFile: string, extraEnv: Record<string, string> = {}): void {
  runScriptHelper({ rootDir, stubBin, appDir, input, outputFile, extraEnv });
}

function runScriptWithCodesignFailure(appDir: string, input: string, outputFile: string): void {
  runScript(appDir, input, outputFile, { CODEXFAST_TEST_CODESIGN_FAIL: "1" });
}

function runScriptWithCodesignVerifyFailure(appDir: string, input: string, outputFile: string): void {
  runScript(appDir, input, outputFile, { CODEXFAST_TEST_CODESIGN_VERIFY_FAIL: "1" });
}

function runScriptWithAsarPackFailure(appDir: string, input: string, outputFile: string): void {
  runScript(appDir, input, outputFile, { CODEXFAST_TEST_ASAR_PACK_FAIL: "1" });
}

function runScriptWithAsarExtractFailure(appDir: string, input: string, outputFile: string): void {
  runScript(appDir, input, outputFile, { CODEXFAST_TEST_ASAR_EXTRACT_FAIL: "1", CODEXFAST_TEST_ALLOW_NONZERO: "1" });
}

function runScriptWithStartupAsarPackFailure(appDir: string, input: string, outputFile: string): void {
  runScript(appDir, input, outputFile, { CODEXFAST_TEST_ASAR_PACK_FAIL: "1", CODEXFAST_TEST_ALLOW_NONZERO: "1" });
}

function runScriptAllowFailure(appDir: string, input: string, outputFile: string): void {
  runScript(appDir, input, outputFile, { CODEXFAST_TEST_ALLOW_NONZERO: "1" });
}

function assertCodesignCalls(expectedMin: number, outputFile: string): void {
  assertCodesignCallsHelper(expectedMin, markerFile, outputFile);
}

function assertCodesignCallContains(expected: string, outputFile: string): void {
  assertCodesignCallContainsHelper(expected, markerFile, outputFile);
}

function resetCodesignCalls(): void {
  resetCodesignCallsHelper(markerFile);
}

function assertTccutilCallContains(expected: string, outputFile: string): void {
  assertTccutilCallContainsHelper(expected, markerFile, outputFile);
}

function assertNoTccutilCalls(outputFile: string): void {
  assertNoTccutilCallsHelper(markerFile, outputFile);
}

function assertNpmCallContains(expected: string, outputFile: string): void {
  assertNpmCallContainsHelper(expected, markerFile, outputFile);
}

function resetTccutilCalls(): void {
  resetTccutilCallsHelper(markerFile);
}

function resetNativeToolCalls(): void {
  resetCodesignCalls();
  resetTccutilCalls();
}

function assertNoPersistentUnpackDir(resourcesDir: string, outputFile: string): void {
  if (existsSync(join(resourcesDir, "app"))) {
    fail("expected no persistent Resources/app directory", readOutput(outputFile));
  }
}

function listCodexfastTempDirs(): Set<string> {
  return new Set(readdirSync(tmpdir()).filter((entry) => entry.startsWith("codexfast.")).map((entry) => join(tmpdir(), entry)));
}

function assertNoNewCodexfastTempDirs(before: Set<string>, outputFile: string): void {
  const after = listCodexfastTempDirs();
  const leaked = [...after].filter((entry) => !before.has(entry));
  if (leaked.length > 0) {
    fail(`expected no leaked codexfast temp directories, found ${leaked.join(", ")}`, readOutput(outputFile));
  }
}

function archiveFile(archivePath: string, relativePath?: string): string {
  return readFakeAsarFile(archivePath, relativePath);
}

function assertApplyState(archivePath: string): void {
  assertContains(archiveFile(archivePath), 'let view="general";', "expected apply to remove the guarded Speed settings return");
  assertContains(archiveFile(archivePath, "webview/assets/index.js"), "enabled:!0", "expected apply to enable the Fast slash command");
  assertContains(archiveFile(archivePath, "webview/assets/use-model-settings.js"), "D=!0", "expected apply to enable the add-context Speed menu");
  assertContains(archiveFile(archivePath, "webview/assets/sidebar.js"), "j=!1", "expected apply to remove the Plugins sidebar api-key gate");
}

function assertGuardedState(archivePath: string, context: string): void {
  assertContains(archiveFile(archivePath), "if(!x)return null;", `expected ${context} to preserve the guarded Speed settings state`);
  assertContains(archiveFile(archivePath, "webview/assets/index.js"), "enabled:n", `expected ${context} to preserve the guarded Fast slash command state`);
  assertContains(archiveFile(archivePath, "webview/assets/use-model-settings.js"), "D=Cr()", `expected ${context} to preserve the guarded add-context Speed menu state`);
  assertContains(archiveFile(archivePath, "webview/assets/sidebar.js"), "j=T===`apikey`", `expected ${context} to preserve the guarded Plugins sidebar state`);
}

function assertApplyState26417(archivePath: string): void {
  assertContains(archiveFile(archivePath, "webview/assets/general-settings-D2eks1ok.js"), "let o;", "expected 26.417 apply to remove the guarded Speed settings return");
  assertContains(archiveFile(archivePath, "webview/assets/index-CxBol07n.js"), "enabled:!0", "expected 26.417 apply to enable the Fast slash command");
  assertContains(archiveFile(archivePath, "webview/assets/use-model-settings-ldiRRtPt.js"), "D=!0", "expected 26.417 apply to enable the add-context Speed menu");
  const sidebar = archiveFile(archivePath, "webview/assets/sidebar-CxBol07n.js");
  assertContains(sidebar, "j=!1", "expected 26.417 apply to remove the Plugins sidebar api-key gate");
  assertContains(sidebar, /j=!1,M=D([,;])/, "expected 26.417 apply to expose the Plugins nav label for api-key users");
}

function assertGuardedState26417(archivePath: string, context: string): void {
  assertContains(archiveFile(archivePath, "webview/assets/general-settings-D2eks1ok.js"), "if(!n)return null;", `expected ${context} to preserve the 26.417 guarded Speed settings state`);
  assertContains(archiveFile(archivePath, "webview/assets/index-CxBol07n.js"), "enabled:n", `expected ${context} to preserve the 26.417 guarded Fast slash command state`);
  assertContains(archiveFile(archivePath, "webview/assets/use-model-settings-ldiRRtPt.js"), "D=cr()", `expected ${context} to preserve the 26.417 guarded add-context Speed menu state`);
  const sidebar = archiveFile(archivePath, "webview/assets/sidebar-CxBol07n.js");
  assertContains(sidebar, "j=O&&A", `expected ${context} to preserve the 26.417 guarded Plugins sidebar state`);
  assertContains(sidebar, "M=D&&!A", `expected ${context} to preserve the 26.417 guarded Plugins nav label state`);
}

function assertApplyState26422(archivePath: string): void {
  assertContains(archiveFile(archivePath, "webview/assets/general-settings-CnVD4YyB.js"), "let a;", "expected 26.422 apply to remove the guarded Speed settings return");
  const index = archiveFile(archivePath, "webview/assets/index-gATb9Tvd.js");
  assertContains(index, "enabled:!0", "expected 26.422 apply to enable the Fast slash command");
  assertContains(index, "g=!0", "expected 26.422 apply to enable the composer Intelligence Speed menu");
  assertContains(index, "A=!1", "expected 26.422 apply to remove the Plugins sidebar api-key gate");
  assertContains(index, /ee=Ha\(\{hostId:me\}\)[,;]/, "expected 26.422 apply to expose the Plugins nav label for api-key users");
  assertContains(index, "codexfast-gpt55", "expected 26.422 apply to inject GPT-5.5 into the model list");
  assertContains(archiveFile(archivePath, "webview/assets/font-settings-C9TXXljS.js"), "codexfast-gpt55-select", "expected 26.422 apply to keep GPT-5.5 visible after the model query filter");
}

function assertApplyState26422WithoutGptPatch(archivePath: string): void {
  assertContains(archiveFile(archivePath, "webview/assets/general-settings-CnVD4YyB.js"), "let a;", "expected 26.422 build 2080 apply to remove the guarded Speed settings return");
  const index = archiveFile(archivePath, "webview/assets/index-gATb9Tvd.js");
  assertContains(index, "enabled:!0", "expected 26.422 build 2080 apply to enable the Fast slash command");
  assertContains(index, "g=!0", "expected 26.422 build 2080 apply to enable the composer Intelligence Speed menu");
  assertContains(index, "A=!1", "expected 26.422 build 2080 apply to remove the Plugins sidebar api-key gate");
  assertNotContains(index, "codexfast-gpt55", "expected 26.422 build 2080 apply to leave the model list handler on the official path");
  assertNotContains(archiveFile(archivePath, "webview/assets/font-settings-C9TXXljS.js"), "codexfast-gpt55-select", "expected 26.422 build 2080 apply to leave the model query selector on the official path");
}

function assertGuardedState26422(archivePath: string, context: string): void {
  assertContains(archiveFile(archivePath, "webview/assets/general-settings-CnVD4YyB.js"), "if(!n)return null;", `expected ${context} to preserve the 26.422 guarded Speed settings state`);
  const index = archiveFile(archivePath, "webview/assets/index-gATb9Tvd.js");
  assertContains(index, "enabled:n", `expected ${context} to preserve the 26.422 guarded Fast slash command state`);
  assertContains(index, "g=_f()", `expected ${context} to preserve the 26.422 guarded composer Intelligence Speed menu state`);
  assertContains(index, "A=O&&k", `expected ${context} to preserve the 26.422 guarded Plugins sidebar state`);
  assertContains(index, "ee=Ha({hostId:me})&&!k", `expected ${context} to preserve the 26.422 guarded Plugins nav label state`);
  assertContains(index, '"list-models-for-host":i9((e,{hostId:t,...n})=>e.sendRequest(`model/list`,n))', `expected ${context} to preserve the guarded model list handler`);
  assertNotContains(index, "codexfast-gpt55", `expected ${context} to remove the GPT-5.5 model list injection`);
  const fontSettings = archiveFile(archivePath, "webview/assets/font-settings-C9TXXljS.js");
  assertContains(fontSettings, "r??=n.models.find(e=>e.model===d.defaultModel)??null,{modelsByType:n,defaultModel:r}", `expected ${context} to preserve the guarded model query selector`);
  assertNotContains(fontSettings, "codexfast-gpt55-select", `expected ${context} to remove the GPT-5.5 model query selector injection`);
}

function assertIntegrityMatches(appDir: string, archivePath: string, message: string): void {
  if (readInfoPlistHash(appDir) !== readFakeAsarHeaderHash(archivePath)) {
    fail(message, readFileSync(join(appDir, "Contents", "Info.plist"), "utf8"));
  }
}

function assertGeneratedCliRuntimeRequirements(): void {
  const generatedCli = readFileSync(join(rootDir, "bin", "codexfast"), "utf8");
  assertContains(generatedCli, 'const MIN_NODE_VERSION = "18.12.0";', "expected generated CLI to enforce Node.js 18.12.0 or later");
  assertContains(generatedCli, '"@electron/asar@3.4.1"', "expected generated CLI to pin the Node 18-compatible asar package");
}

function renameBackupSuffixes(dir: string, fromSuffix: string, toSuffix: string): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      renameBackupSuffixes(fullPath, fromSuffix, toSuffix);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(fromSuffix)) {
      renameSync(fullPath, `${fullPath.slice(0, -fromSuffix.length)}${toSuffix}`);
    }
  }
}

function runApplyRestoreCase(caseConfig: {
  name: string;
  appDir: string;
  assetsRoot: string;
  appVersion?: string;
  appBuild?: string;
  assetProfile?: AssetProfile;
  applyAssert: (archivePath: string) => void;
  restoreAssert: (archivePath: string, context: string) => void;
  restoreContext: string;
  statusAssert?: (output: string) => void;
  postApplyAssert?: (output: string) => void;
}): void {
  const resourcesDir = join(caseConfig.appDir, "Contents", "Resources");
  const archivePath = join(resourcesDir, "app.asar");
  const applyOutput = join(tmpDir, `${caseConfig.name}-apply.txt`);
  const statusOutput = join(tmpDir, `${caseConfig.name}-status.txt`);
  const restoreOutput = join(tmpDir, `${caseConfig.name}-restore.txt`);
  prepareArchivedFakeApp(caseConfig.appDir, caseConfig.assetsRoot, caseConfig.appVersion, caseConfig.appBuild, caseConfig.assetProfile);

  runScript(caseConfig.appDir, "2\n\nq\n", applyOutput);
  assertNpmCallContains("--package @electron/asar@3.4.1", applyOutput);
  assertCodesignCalls(1, applyOutput);
  assertTccutilCallContains("reset ScreenCapture com.openai.codex", applyOutput);
  assertContains(readOutput(applyOutput), "Reset macOS screen recording permission for com.openai.codex.", "expected apply to report TCC reset", readOutput(applyOutput));
  assertNoPersistentUnpackDir(resourcesDir, applyOutput);
  assertFakeAsarJsParses(archivePath);
  caseConfig.applyAssert(archivePath);
  caseConfig.postApplyAssert?.(readOutput(applyOutput));
  resetNativeToolCalls();

  if (caseConfig.statusAssert) {
    runScript(caseConfig.appDir, "1\n\nq\n", statusOutput);
    caseConfig.statusAssert(readOutput(statusOutput));
  }

  runScript(caseConfig.appDir, "3\n\nq\n", restoreOutput);
  assertCodesignCalls(1, restoreOutput);
  assertTccutilCallContains("reset ScreenCapture com.openai.codex", restoreOutput);
  assertContains(readOutput(restoreOutput), "Reset macOS screen recording permission for com.openai.codex.", "expected restore to report TCC reset", readOutput(restoreOutput));
  assertNoPersistentUnpackDir(resourcesDir, restoreOutput);
  assertFakeAsarJsParses(archivePath);
  caseConfig.restoreAssert(archivePath, caseConfig.restoreContext);
  assertIntegrityMatches(caseConfig.appDir, archivePath, `expected ElectronAsarIntegrity hash to match restored ${caseConfig.restoreContext} app.asar header`);
  assertContains(readOutput(restoreOutput), "Exit code: 0", "expected archive restore to print a successful exit code", readOutput(restoreOutput));
  resetNativeToolCalls();
}

function main(): void {
  assertGeneratedCliRuntimeRequirements();
  setupStubs();

  runApplyRestoreCase({
    name: "existing",
    appDir: join(tmpDir, "Existing.app"),
    assetsRoot: join(tmpDir, "existing-assets"),
    applyAssert: (archivePath) => {
      assertApplyState(archivePath);
      if (!existsSync(join(tmpDir, "Existing.app", "Contents", "Resources", "app.asar1"))) {
        fail("expected archive backup to be created on apply");
      }
    },
    restoreAssert: assertGuardedState,
    restoreContext: "restore",
  });

  runApplyRestoreCase({
    name: "supported-26417",
    appDir: join(tmpDir, "Supported26417.app"),
    assetsRoot: join(tmpDir, "supported-26417-assets"),
    appVersion: "26.417.41555",
    appBuild: "1858",
    assetProfile: "26417",
    applyAssert: assertApplyState26417,
    restoreAssert: assertGuardedState26417,
    restoreContext: "26.417 restore",
  });

  const partial26417App = join(tmpDir, "Supported26417Partial.app");
  const partial26417Resources = join(partial26417App, "Contents", "Resources");
  const partial26417Output = join(tmpDir, "apply-26417-partial-output.txt");
  prepareArchivedFakeApp(partial26417App, join(tmpDir, "supported-26417-partial-assets"), "26.417.41555", "1858", "26417-partial");
  runScript(partial26417App, "2\n\nq\n", partial26417Output);
  assertCodesignCalls(1, partial26417Output);
  assertNoPersistentUnpackDir(partial26417Resources, partial26417Output);
  assertFakeAsarJsParses(join(partial26417Resources, "app.asar"));
  assertApplyState26417(join(partial26417Resources, "app.asar"));
  resetCodesignCalls();

  runApplyRestoreCase({
    name: "supported-26422",
    appDir: join(tmpDir, "Supported26422.app"),
    assetsRoot: join(tmpDir, "supported-26422-assets"),
    appVersion: "26.422.21637",
    appBuild: "2056",
    assetProfile: "26422",
    applyAssert: assertApplyState26422,
    restoreAssert: assertGuardedState26422,
    restoreContext: "26.422 restore",
    statusAssert: (output) => {
      assertNotContains(output, "Current state: GPT-5.5 model query selector disabled", "expected 26.422 status to report the GPT-5.5 model query selector as enabled after apply", output);
      assertContains(output, "Current state: GPT-5.5 model query selector enabled", "expected 26.422 status to include the GPT-5.5 model query selector target", output);
    },
  });

  runApplyRestoreCase({
    name: "supported-26422-2080",
    appDir: join(tmpDir, "Supported26422Build2080.app"),
    assetsRoot: join(tmpDir, "supported-26422-2080-assets"),
    appVersion: "26.422.30944",
    appBuild: "2080",
    assetProfile: "26422",
    applyAssert: assertApplyState26422WithoutGptPatch,
    restoreAssert: assertGuardedState26422,
    restoreContext: "26.422 build 2080 restore",
    postApplyAssert: (output) => assertNotContains(output, "patched: GPT-5.5", "expected 26.422 build 2080 apply to skip GPT-5.5 patch targets", output),
    statusAssert: (output) => assertNotContains(output, "GPT-5.5 model", "expected 26.422 build 2080 status to omit unpatched GPT-5.5 compatibility targets", output),
  });

  const inlineApp = join(tmpDir, "Supported26422Build2080InlineRestore.app");
  const inlineResources = join(inlineApp, "Contents", "Resources");
  const inlineArchive = join(inlineResources, "app.asar");
  prepareArchivedFakeApp(inlineApp, join(tmpDir, "supported-26422-2080-inline-assets"), "26.422.21637", "2056", "26422");
  runScript(inlineApp, "2\n\nq\n", join(tmpDir, "apply-26422-2080-inline-output.txt"));
  assertApplyState26422(inlineArchive);
  rmSync(join(inlineResources, "app.asar1"), { force: true });
  writeInfoPlist(inlineApp, readFakeAsarHeaderHash(inlineArchive), "26.422.30944", "2080");
  const inlineRestoreOutput = join(tmpDir, "restore-26422-2080-inline-output.txt");
  runScript(inlineApp, "3\n\nq\n", inlineRestoreOutput);
  assertNoPersistentUnpackDir(inlineResources, inlineRestoreOutput);
  assertFakeAsarJsParses(inlineArchive);
  assertGuardedState26422(inlineArchive, "26.422 build 2080 inline restore from 0.5.2 state");
  resetCodesignCalls();

  const legacyBackupApp = join(tmpDir, "LegacyFileBackup.app");
  const legacyBackupResources = join(legacyBackupApp, "Contents", "Resources");
  const legacyBackupArchive = join(legacyBackupResources, "app.asar");
  const legacyBackupOutput = join(tmpDir, "legacy-file-backup-restore-output.txt");
  const legacyBackupExtracted = join(tmpDir, "legacy-file-backup-extracted");
  prepareArchivedFakeApp(legacyBackupApp, join(tmpDir, "legacy-file-backup-assets"));
  runScript(legacyBackupApp, "2\n\nq\n", join(tmpDir, "legacy-file-backup-apply-output.txt"));
  assertApplyState(legacyBackupArchive);
  rmSync(join(legacyBackupResources, "app.asar1"), { force: true });
  extractFakeAsar(legacyBackupArchive, legacyBackupExtracted);
  renameBackupSuffixes(legacyBackupExtracted, ".codexfast.bak", ".speed-setting.bak");
  writeFakeAsar(legacyBackupExtracted, legacyBackupArchive);
  writeInfoPlist(legacyBackupApp, readFakeAsarHeaderHash(legacyBackupArchive));
  runScript(legacyBackupApp, "3\n\nq\n", legacyBackupOutput);
  assertFakeAsarJsParses(legacyBackupArchive);
  assertGuardedState(legacyBackupArchive, "legacy file backup restore");
  assertContains(readOutput(legacyBackupOutput), "restored backup: Speed setting", "expected restore to use legacy file-level backup suffix", readOutput(legacyBackupOutput));
  resetCodesignCalls();

  const legacyMixedBackupApp = join(tmpDir, "LegacyMixedBackup.app");
  const legacyMixedBackupResources = join(legacyMixedBackupApp, "Contents", "Resources");
  const legacyMixedBackupArchive = join(legacyMixedBackupResources, "app.asar");
  const legacyMixedBackupExtracted = join(tmpDir, "legacy-mixed-backup-extracted");
  const legacyMixedApplyOutput = join(tmpDir, "legacy-mixed-backup-apply-output.txt");
  const legacyMixedRestoreOutput = join(tmpDir, "legacy-mixed-backup-restore-output.txt");
  prepareArchivedFakeApp(legacyMixedBackupApp, join(tmpDir, "legacy-mixed-backup-assets"), "26.422.21637", "2056", "26422");
  extractFakeAsar(legacyMixedBackupArchive, legacyMixedBackupExtracted);
  const legacyMixedIndexFile = join(legacyMixedBackupExtracted, "webview", "assets", "index-gATb9Tvd.js");
  const legacyMixedOriginalIndex = readFileSync(legacyMixedIndexFile, "utf8");
  writeFileSync(`${legacyMixedIndexFile}.speed-setting.bak`, legacyMixedOriginalIndex);
  writeFileSync(legacyMixedIndexFile, legacyMixedOriginalIndex.replace("A=O&&k,", "A=!1,"));
  writeFakeAsar(legacyMixedBackupExtracted, legacyMixedBackupArchive);
  writeInfoPlist(legacyMixedBackupApp, readFakeAsarHeaderHash(legacyMixedBackupArchive), "26.422.21637", "2056");
  runScript(legacyMixedBackupApp, "2\n\nq\n", legacyMixedApplyOutput);
  assertFakeAsarJsParses(legacyMixedBackupArchive);
  assertApplyState26422(legacyMixedBackupArchive);
  rmSync(join(legacyMixedBackupResources, "app.asar1"), { force: true });
  runScript(legacyMixedBackupApp, "3\n\nq\n", legacyMixedRestoreOutput);
  assertFakeAsarJsParses(legacyMixedBackupArchive);
  assertGuardedState26422(legacyMixedBackupArchive, "legacy mixed file backup restore");
  assertContains(readOutput(legacyMixedRestoreOutput), "restored backup: Fast slash command", "expected restore to use existing legacy file backup without seeding a polluted new backup", readOutput(legacyMixedRestoreOutput));
  resetCodesignCalls();

  const legacyInlineApplyApp = join(tmpDir, "LegacyInlineApply.app");
  const legacyInlineApplyResources = join(legacyInlineApplyApp, "Contents", "Resources");
  const legacyInlineApplyArchive = join(legacyInlineApplyResources, "app.asar");
  const legacyInlineApplyExtracted = join(tmpDir, "legacy-inline-apply-extracted");
  const legacyInlineApplyOutput = join(tmpDir, "legacy-inline-apply-output.txt");
  prepareArchivedFakeApp(legacyInlineApplyApp, join(tmpDir, "legacy-inline-apply-assets"));
  extractFakeAsar(legacyInlineApplyArchive, legacyInlineApplyExtracted);
  const legacyInlineSpeedFile = join(legacyInlineApplyExtracted, "webview", "assets", "general-settings.js");
  writeFileSync(
    legacyInlineSpeedFile,
    readFileSync(legacyInlineSpeedFile, "utf8").replace(
      "x=_e(),{serviceTierSettings:y,setServiceTier:z}=Ce();if(!x)return null;let ",
      "x=!0,{serviceTierSettings:y,setServiceTier:z}=Ce();let ",
    ),
  );
  writeFakeAsar(legacyInlineApplyExtracted, legacyInlineApplyArchive);
  writeInfoPlist(legacyInlineApplyApp, readFakeAsarHeaderHash(legacyInlineApplyArchive));
  runScript(legacyInlineApplyApp, "2\n\nq\n", legacyInlineApplyOutput);
  assertNoPersistentUnpackDir(legacyInlineApplyResources, legacyInlineApplyOutput);
  assertFakeAsarJsParses(legacyInlineApplyArchive);
  assertApplyState(legacyInlineApplyArchive);
  assertNotContains(archiveFile(legacyInlineApplyArchive), "$3", "expected legacy inline speed-setting normalization to avoid literal replacement groups");
  resetCodesignCalls();

  const futureGptSkipApp = join(tmpDir, "FutureGptSkip.app");
  const futureGptSkipOutput = join(tmpDir, "status-future-gpt-skip-output.txt");
  prepareArchivedFakeApp(futureGptSkipApp, join(tmpDir, "future-gpt-skip-assets"), "26.500.0", "9999", "26422");
  runScript(futureGptSkipApp, "1\n\nq\n", futureGptSkipOutput);
  assertNotContains(readOutput(futureGptSkipOutput), "GPT-5.5 model", "expected post-26.422.30944 status to omit unpatched GPT-5.5 compatibility targets", readOutput(futureGptSkipOutput));
  resetCodesignCalls();

  const staleTempApp = join(tmpDir, "StaleTemp.app");
  const staleTempResources = join(staleTempApp, "Contents", "Resources");
  const staleTempOutput = join(tmpDir, "stale-temp-output.txt");
  const staleTempFile = join(staleTempResources, ".codexfast.12345.app.asar.tmp");
  prepareArchivedFakeApp(staleTempApp, join(tmpDir, "stale-temp-assets"));
  writeFileSync(staleTempFile, "stale");
  runScript(staleTempApp, "1\n\nq\n", staleTempOutput);
  if (existsSync(staleTempFile)) {
    fail("expected stale app.asar temp file to be removed during startup checks", readOutput(staleTempOutput));
  }
  resetCodesignCalls();

  const legacyApp = join(tmpDir, "Legacy.app");
  const legacyResources = join(legacyApp, "Contents", "Resources");
  const legacyOutput = join(tmpDir, "legacy-output.txt");
  prepareLegacyFakeApp(legacyApp, join(tmpDir, "legacy-unpacked-assets"), join(tmpDir, "legacy-assets"), "legacy-placeholder-hash");
  runScript(legacyApp, "1\n\nq\n", legacyOutput);
  assertCodesignCalls(1, legacyOutput);
  assertNoPersistentUnpackDir(legacyResources, legacyOutput);
  assertFakeAsarJsParses(join(legacyResources, "app.asar"));
  if (!existsSync(join(legacyResources, "app.asar"))) {
    fail("expected legacy unpacked layout to be repacked into app.asar", readOutput(legacyOutput));
  }
  assertGuardedState(join(legacyResources, "app.asar"), "legacy repack");
  assertIntegrityMatches(legacyApp, join(legacyResources, "app.asar"), "expected ElectronAsarIntegrity hash to match migrated app.asar header");
  resetCodesignCalls();

  const packFailApp = join(tmpDir, "PackFail.app");
  const packFailResources = join(packFailApp, "Contents", "Resources");
  const packFailArchive = join(packFailResources, "app.asar");
  const packFailOutput = join(tmpDir, "pack-fail-output.txt");
  prepareArchivedFakeApp(packFailApp, join(tmpDir, "pack-fail-assets"));
  const packFailOriginalArchive = readFileSync(packFailArchive);
  const packFailOriginalHash = readInfoPlistHash(packFailApp);
  runScriptWithAsarPackFailure(packFailApp, "2\n\nq\n", packFailOutput);
  assertNoPersistentUnpackDir(packFailResources, packFailOutput);
  if (!readFileSync(packFailArchive).equals(packFailOriginalArchive)) {
    fail("expected failed temp pack to leave installed app.asar unchanged", readOutput(packFailOutput));
  }
  if (readInfoPlistHash(packFailApp) !== packFailOriginalHash) {
    fail("expected failed temp pack to leave ElectronAsarIntegrity unchanged", readOutput(packFailOutput));
  }
  const packFailText = readOutput(packFailOutput);
  assertContains(packFailText, "Failed to repack app.asar.", "expected pack failure to be reported", packFailText);
  assertContains(packFailText, "Exit code: 1", "expected a failed action exit code when asar pack fails", packFailText);
  assertNotContains(packFailText, "Running local ad-hoc re-sign", "expected failed pack to stop before re-signing", packFailText);
  resetCodesignCalls();

  const legacyPackFailApp = join(tmpDir, "LegacyPackFail.app");
  const legacyPackFailResources = join(legacyPackFailApp, "Contents", "Resources");
  const legacyPackFailArchive = join(legacyPackFailResources, "app.asar");
  const legacyPackFailUnpackedDir = join(legacyPackFailResources, "app");
  const legacyPackFailOutput = join(tmpDir, "legacy-pack-fail-output.txt");
  prepareLegacyFakeApp(legacyPackFailApp, join(tmpDir, "legacy-pack-fail-unpacked-assets"), join(tmpDir, "legacy-pack-fail-assets"), "legacy-pack-fail-placeholder-hash");
  writeFileSync(legacyPackFailArchive, readFileSync(join(legacyPackFailResources, "app.asar1")));
  const legacyPackFailOriginalArchive = readFileSync(legacyPackFailArchive);
  const legacyPackFailOriginalHash = readInfoPlistHash(legacyPackFailApp);
  const legacyPackFailTempDirs = listCodexfastTempDirs();
  runScriptWithStartupAsarPackFailure(legacyPackFailApp, "1\n\nq\n", legacyPackFailOutput);
  assertNoNewCodexfastTempDirs(legacyPackFailTempDirs, legacyPackFailOutput);
  if (!existsSync(legacyPackFailUnpackedDir)) {
    fail("expected failed legacy temp pack to preserve Resources/app", readOutput(legacyPackFailOutput));
  }
  if (!readFileSync(legacyPackFailArchive).equals(legacyPackFailOriginalArchive)) {
    fail("expected failed legacy temp pack to leave installed app.asar unchanged", readOutput(legacyPackFailOutput));
  }
  if (readInfoPlistHash(legacyPackFailApp) !== legacyPackFailOriginalHash) {
    fail("expected failed legacy temp pack to leave ElectronAsarIntegrity unchanged", readOutput(legacyPackFailOutput));
  }
  assertContains(readOutput(legacyPackFailOutput), "Failed to repack legacy Resources/app directory.", "expected legacy pack failure to be reported", readOutput(legacyPackFailOutput));
  resetCodesignCalls();

  const extractFailApp = join(tmpDir, "ExtractFail.app");
  const extractFailOutput = join(tmpDir, "extract-fail-output.txt");
  prepareArchivedFakeApp(extractFailApp, join(tmpDir, "extract-fail-assets"));
  const extractFailTempDirs = listCodexfastTempDirs();
  runScriptWithAsarExtractFailure(extractFailApp, "2\n\nq\n", extractFailOutput);
  assertNoNewCodexfastTempDirs(extractFailTempDirs, extractFailOutput);
  assertContains(readOutput(extractFailOutput), "Failed to unpack app.asar.", "expected extract failure to be reported", readOutput(extractFailOutput));
  assertContains(readOutput(extractFailOutput), "Exit code: 1", "expected failed extract to return exit code 1", readOutput(extractFailOutput));
  resetCodesignCalls();

  const integrityFailApp = join(tmpDir, "IntegrityFail.app");
  const integrityFailResources = join(integrityFailApp, "Contents", "Resources");
  const integrityFailArchive = join(integrityFailResources, "app.asar");
  const integrityFailOutput = join(tmpDir, "integrity-fail-output.txt");
  prepareArchivedFakeApp(integrityFailApp, join(tmpDir, "integrity-fail-assets"));
  const integrityFailOriginalArchive = readFileSync(integrityFailArchive);
  const integrityFailOriginalHash = readInfoPlistHash(integrityFailApp);
  chmodSync(join(integrityFailApp, "Contents", "Info.plist"), 0o444);
  runScriptAllowFailure(integrityFailApp, "2\n\nq\n", integrityFailOutput);
  chmodSync(join(integrityFailApp, "Contents", "Info.plist"), 0o644);
  if (!readFileSync(integrityFailArchive).equals(integrityFailOriginalArchive)) {
    fail("expected failed integrity update during apply to restore the previous app.asar", readOutput(integrityFailOutput));
  }
  if (readInfoPlistHash(integrityFailApp) !== integrityFailOriginalHash) {
    fail("expected failed integrity update during apply to preserve the previous ElectronAsarIntegrity hash", readOutput(integrityFailOutput));
  }
  assertContains(readOutput(integrityFailOutput), "ElectronAsarIntegrity hash verification failed after updating Info.plist.", "expected integrity failure to be reported", readOutput(integrityFailOutput));
  assertContains(readOutput(integrityFailOutput), "Exit code: 1", "expected failed integrity update to return exit code 1", readOutput(integrityFailOutput));
  resetCodesignCalls();

  const restoreIntegrityFailApp = join(tmpDir, "RestoreIntegrityFail.app");
  const restoreIntegrityFailResources = join(restoreIntegrityFailApp, "Contents", "Resources");
  const restoreIntegrityFailArchive = join(restoreIntegrityFailResources, "app.asar");
  const restoreIntegrityApplyOutput = join(tmpDir, "restore-integrity-fail-apply-output.txt");
  const restoreIntegrityOutput = join(tmpDir, "restore-integrity-fail-output.txt");
  prepareArchivedFakeApp(restoreIntegrityFailApp, join(tmpDir, "restore-integrity-fail-assets"));
  runScript(restoreIntegrityFailApp, "2\n\nq\n", restoreIntegrityApplyOutput);
  const restoreIntegrityPatchedArchive = readFileSync(restoreIntegrityFailArchive);
  const restoreIntegrityPatchedHash = readInfoPlistHash(restoreIntegrityFailApp);
  chmodSync(join(restoreIntegrityFailApp, "Contents", "Info.plist"), 0o444);
  runScriptAllowFailure(restoreIntegrityFailApp, "3\n\nq\n", restoreIntegrityOutput);
  chmodSync(join(restoreIntegrityFailApp, "Contents", "Info.plist"), 0o644);
  if (!readFileSync(restoreIntegrityFailArchive).equals(restoreIntegrityPatchedArchive)) {
    fail("expected failed integrity update during archive restore to restore the previous app.asar", readOutput(restoreIntegrityOutput));
  }
  if (readInfoPlistHash(restoreIntegrityFailApp) !== restoreIntegrityPatchedHash) {
    fail("expected failed integrity update during archive restore to preserve the previous ElectronAsarIntegrity hash", readOutput(restoreIntegrityOutput));
  }
  assertContains(readOutput(restoreIntegrityOutput), "ElectronAsarIntegrity hash verification failed after updating Info.plist.", "expected restore integrity failure to be reported", readOutput(restoreIntegrityOutput));
  assertContains(readOutput(restoreIntegrityOutput), "Exit code: 1", "expected failed restore integrity update to return exit code 1", readOutput(restoreIntegrityOutput));
  resetCodesignCalls();

  const missingBundleIdApp = join(tmpDir, "MissingBundleId.app");
  const missingBundleIdResources = join(missingBundleIdApp, "Contents", "Resources");
  const missingBundleIdArchive = join(missingBundleIdResources, "app.asar");
  const missingBundleIdOutput = join(tmpDir, "missing-bundle-id-output.txt");
  prepareArchivedFakeApp(missingBundleIdApp, join(tmpDir, "missing-bundle-id-assets"));
  writeInfoPlist(missingBundleIdApp, readFakeAsarHeaderHash(missingBundleIdArchive), "26.415.40636", "1799", null);
  resetTccutilCalls();
  runScript(missingBundleIdApp, "2\n\nq\n", missingBundleIdOutput);
  assertNoTccutilCalls(missingBundleIdOutput);
  assertContains(readOutput(missingBundleIdOutput), "Could not reset macOS screen recording permission because CFBundleIdentifier was not found.", "expected missing bundle id to skip TCC reset", readOutput(missingBundleIdOutput));
  resetCodesignCalls();

  const unsupportedApp = join(tmpDir, "Unsupported.app");
  const unsupportedResources = join(unsupportedApp, "Contents", "Resources");
  const unsupportedOutput = join(tmpDir, "unsupported-output.txt");
  prepareArchivedFakeApp(unsupportedApp, join(tmpDir, "unsupported-assets"), "99.0.0", "9999");
  runScript(unsupportedApp, "2\n\nq\n", unsupportedOutput);
  assertNoPersistentUnpackDir(unsupportedResources, unsupportedOutput);
  const unsupportedText = readOutput(unsupportedOutput);
  assertNotContains(unsupportedText, "Running local ad-hoc re-sign", "expected unsupported versions to be blocked before re-signing", unsupportedText);
  if (existsSync(join(unsupportedResources, "app.asar1"))) {
    fail("expected unsupported versions to be blocked before creating app.asar1", unsupportedText);
  }
  assertContains(unsupportedText, "Compatibility: unsupported", "expected unsupported compatibility status in output", unsupportedText);
  assertContains(unsupportedText, "Enable custom API features is blocked for this Codex.app version.", "expected apply to be blocked for unsupported versions", unsupportedText);
  assertContains(archiveFile(join(unsupportedResources, "app.asar")), "if(!x)return null;", "expected unsupported version to leave app.asar unchanged");
  resetCodesignCalls();

  const failingApp = join(tmpDir, "Failing.app");
  const failingResources = join(failingApp, "Contents", "Resources");
  const failingOutput = join(tmpDir, "failing-output.txt");
  prepareArchivedFakeApp(failingApp, join(tmpDir, "failing-assets"));
  runScriptWithCodesignFailure(failingApp, "2\n\nq\n", failingOutput);
  assertNoPersistentUnpackDir(failingResources, failingOutput);
  assertFakeAsarJsParses(join(failingResources, "app.asar"));
  const failingText = readOutput(failingOutput);
  assertContains(failingText, `codesign --force --deep --sign - ${failingApp}`, "expected manual re-sign guidance in failure output", failingText);
  assertContains(failingText, "Exit code: 1", "expected a failed action exit code when codesign fails", failingText);
  resetCodesignCalls();

  const verifyFailingApp = join(tmpDir, "VerifyFailing.app");
  const verifyFailingResources = join(verifyFailingApp, "Contents", "Resources");
  const verifyFailingOutput = join(tmpDir, "verify-failing-output.txt");
  prepareArchivedFakeApp(verifyFailingApp, join(tmpDir, "verify-failing-assets"));
  runScriptWithCodesignVerifyFailure(verifyFailingApp, "2\n\nq\n", verifyFailingOutput);
  assertNoPersistentUnpackDir(verifyFailingResources, verifyFailingOutput);
  assertFakeAsarJsParses(join(verifyFailingResources, "app.asar"));
  assertCodesignCallContains(`--verify --deep --strict --verbose=2 ${verifyFailingApp}`, verifyFailingOutput);
  const verifyFailingText = readOutput(verifyFailingOutput);
  assertContains(verifyFailingText, "Failed to verify the re-signed Codex.app.", "expected verify failure to be reported", verifyFailingText);
  assertContains(verifyFailingText, `codesign --verify --deep --strict --verbose=2 ${verifyFailingApp}`, "expected manual verify guidance in failure output", verifyFailingText);
  assertContains(verifyFailingText, "Restore original app", "expected verify failure guidance to mention restoring the original app", verifyFailingText);
  assertContains(verifyFailingText, "Exit code: 1", "expected a failed action exit code when codesign verify fails", verifyFailingText);

  console.log("re-sign flow test passed");
}

try {
  main();
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}
