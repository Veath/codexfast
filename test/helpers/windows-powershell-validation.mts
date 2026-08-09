import { spawnSync } from "node:child_process";
import {
  windowsPackageQueryPowerShellSource,
  windowsPackagedActivationPowerShellSource,
  windowsProcessIdentityPowerShellSource,
  windowsVerifiedTerminationPowerShellSource,
} from "../../src/cli-platform.mts";
import { resolveCommand } from "../../src/cli-utils.mts";

export type WindowsPowerShellFragment = {
  name: string;
  sourceFactoryName: string;
  source: string;
  compileCSharpHelper: boolean;
};

export function windowsPowerShellFragments(): WindowsPowerShellFragment[] {
  return [
    {
      name: "package-query",
      sourceFactoryName: "windowsPackageQueryPowerShellSource",
      source: windowsPackageQueryPowerShellSource(),
      compileCSharpHelper: false,
    },
    {
      name: "packaged-activation",
      sourceFactoryName: "windowsPackagedActivationPowerShellSource",
      source: windowsPackagedActivationPowerShellSource(),
      compileCSharpHelper: true,
    },
    {
      name: "process-identity",
      sourceFactoryName: "windowsProcessIdentityPowerShellSource",
      source: windowsProcessIdentityPowerShellSource(),
      compileCSharpHelper: false,
    },
    {
      name: "verified-termination",
      sourceFactoryName: "windowsVerifiedTerminationPowerShellSource",
      source: windowsVerifiedTerminationPowerShellSource(),
      compileCSharpHelper: true,
    },
  ];
}

export function encodeWindowsPowerShellCommand(source: string): string {
  return Buffer.from(source, "utf16le").toString("base64");
}

export const windowsPowerShellValidationHarnessSource = String.raw`$ErrorActionPreference = 'Stop'
$edition = [string]$PSVersionTable.PSEdition
if (
  $PSVersionTable.PSVersion.Major -ne 5 -or
  $PSVersionTable.PSVersion.Minor -ne 1 -or
  $edition -ne 'Desktop'
) {
  throw "Expected Windows PowerShell 5.1 Desktop, got $($PSVersionTable.PSVersion) $edition."
}

$scriptBytes = [Convert]::FromBase64String($env:CODEXFAST_VALIDATION_SOURCE_BASE64)
$scriptSource = [Text.Encoding]::UTF8.GetString($scriptBytes)
# Parse the production fragment as data. Do not invoke the script block.
$tokens = $null
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseInput(
  $scriptSource,
  [ref]$tokens,
  [ref]$parseErrors
)
if (@($parseErrors).Count -gt 0) {
  $details = @($parseErrors | ForEach-Object {
    "line $($_.Extent.StartLineNumber), column $($_.Extent.StartColumnNumber): $($_.Message)"
  }) -join '; '
  throw "PowerShell AST parse failed: $details"
}

if ($env:CODEXFAST_VALIDATION_COMPILE_CSHARP -eq '1') {
  # Compile only the embedded Add-Type helper; do not call the COM activator.
  $sourceAssignments = @($ast.FindAll({
    param($candidate)
    return (
      $candidate -is [System.Management.Automation.Language.AssignmentStatementAst] -and
      $candidate.Left -is [System.Management.Automation.Language.VariableExpressionAst] -and
      $candidate.Left.VariablePath.UserPath -eq 'source'
    )
  }, $true))
  if ($sourceAssignments.Count -ne 1) {
    throw "Expected exactly one C# source assignment, found $($sourceAssignments.Count)."
  }
  $csharpSource = [string]$sourceAssignments[0].Right.Value
  if ([string]::IsNullOrWhiteSpace($csharpSource)) {
    throw 'The activation C# helper source is empty.'
  }
  Add-Type -TypeDefinition $csharpSource -Language CSharp -PassThru | Out-Null

  if ($env:CODEXFAST_VALIDATION_FRAGMENT_NAME -eq 'packaged-activation') {
    $expectedPortArgument = '--remote-debugging-port=45678'
    $expectedAddressArgument = '--remote-debugging-address=127.0.0.1'
    $exactCommandLine = '"C:\Program Files\WindowsApps\OpenAI.Codex\app\ChatGPT.exe" --remote-debugging-port=45678 --remote-debugging-address=127.0.0.1'
    if (-not [CodexfastPackagedAppActivator]::HasOnlyExpectedRemoteDebuggingArguments(
      $exactCommandLine,
      $expectedPortArgument,
      $expectedAddressArgument
    )) {
      throw 'Native activation argument parsing rejected the exact CDP argument set.'
    }
    $invalidCommandLines = @(
      '"C:\Program Files\WindowsApps\OpenAI.Codex\app\ChatGPT.exe" --wrapper="--remote-debugging-port=45678" --remote-debugging-address=127.0.0.1',
      '"C:\Program Files\WindowsApps\OpenAI.Codex\app\ChatGPT.exe" "--remote-debugging-port=45678 --remote-debugging-address=127.0.0.1"',
      '"C:\Program Files\WindowsApps\OpenAI.Codex\app\ChatGPT.exe" --remote-debugging-port=45678 --remote-debugging-port=45678 --remote-debugging-address=127.0.0.1',
      '"C:\Program Files\WindowsApps\OpenAI.Codex\app\ChatGPT.exe" --remote-debugging-port=45678 --remote-debugging-address=127.0.0.1 --remote-debugging-address=127.0.0.1',
      '"C:\Program Files\WindowsApps\OpenAI.Codex\app\ChatGPT.exe" --remote-debugging-port=45678 --remote-debugging-address=127.0.0.1 --remote-debugging-address=0.0.0.0',
      '"C:\Program Files\WindowsApps\OpenAI.Codex\app\ChatGPT.exe" --remote-debugging-port=45678 --remote-debugging-address=127.0.0.1 --remote-debugging-pipe'
    )
    foreach ($invalidCommandLine in $invalidCommandLines) {
      if ([CodexfastPackagedAppActivator]::HasOnlyExpectedRemoteDebuggingArguments(
        $invalidCommandLine,
        $expectedPortArgument,
        $expectedAddressArgument
      )) {
        throw "Native activation argument parsing accepted an unsafe command line: $invalidCommandLine"
      }
    }
  }
}

[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::Out.Write(
  "validated $($env:CODEXFAST_VALIDATION_FRAGMENT_NAME) with Windows PowerShell $($PSVersionTable.PSVersion)"
)`;

export function validateWindowsPowerShell51Fragments(): void {
  if (process.platform !== "win32") {
    throw new Error(
      "Windows PowerShell validation must run on a Windows host.",
    );
  }
  const powershell = resolveCommand("powershell.exe");
  if (!powershell) {
    throw new Error("Windows PowerShell 5.1 powershell.exe was not found.");
  }
  const encodedHarness = encodeWindowsPowerShellCommand(
    windowsPowerShellValidationHarnessSource,
  );
  for (const fragment of windowsPowerShellFragments()) {
    const result = spawnSync(
      powershell,
      ["-NoProfile", "-NonInteractive", "-EncodedCommand", encodedHarness],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          CODEXFAST_VALIDATION_COMPILE_CSHARP:
            fragment.compileCSharpHelper ? "1" : "0",
          CODEXFAST_VALIDATION_FRAGMENT_NAME: fragment.name,
          CODEXFAST_VALIDATION_SOURCE_BASE64:
            Buffer.from(fragment.source, "utf8").toString("base64"),
        },
        timeout: 30_000,
        windowsHide: true,
      },
    );
    if (result.error) {
      throw new Error(
        `${fragment.name} PowerShell validation failed to start: ${result.error.message}`,
      );
    }
    if (result.status !== 0) {
      throw new Error(
        `${fragment.name} PowerShell validation failed: ${result.stderr.trim() || result.stdout.trim() || `powershell.exe exited with ${String(result.status)}`}`,
      );
    }
    const expectedOutput =
      `validated ${fragment.name} with Windows PowerShell 5.1`;
    if (!result.stdout.includes(expectedOutput)) {
      throw new Error(
        `${fragment.name} PowerShell validation returned unexpected output: ${result.stdout.trim()}`,
      );
    }
  }
}
