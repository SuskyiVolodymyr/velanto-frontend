$inputJson = [Console]::In.ReadToEnd() | ConvertFrom-Json
$command = $inputJson.tool_input.command
$cwd = $inputJson.cwd

if ($command -notmatch 'git\s+commit') {
    exit 0
}

Push-Location $cwd
try {
    $staged = git diff --cached --name-only 2>$null
} finally {
    Pop-Location
}

$secretPattern = '(^|/)\.env(\.[^.]+)?$|\.pem$|\.pfx$|\.key$|id_rsa'
$hit = $staged | Where-Object { $_ -match $secretPattern }

if ($hit) {
    $reason = "Blocked by check-secrets-on-commit hook: staged file(s) look like secrets: $($hit -join ', '). Remove them from the commit or add to .gitignore if this is a false positive."
    $result = @{
        hookSpecificOutput = @{
            hookEventName        = "PreToolUse"
            permissionDecision   = "deny"
            permissionDecisionReason = $reason
        }
    } | ConvertTo-Json -Depth 5
    Write-Output $result
}

exit 0
