param(
  [string]$SourcePath,
  [switch]$Stage,
  [switch]$Commit,
  [switch]$Push,
  [string]$CommitMessage = 'Update seed overrides from exported app data'
)

$ErrorActionPreference = 'Stop'

function Resolve-RepoRoot {
  param([string]$StartDir)
  $dir = Resolve-Path -LiteralPath $StartDir
  while ($true) {
    if (Test-Path -LiteralPath (Join-Path $dir '.git')) { return $dir }
    $parent = Split-Path -Parent $dir
    if (-not $parent -or $parent -eq $dir) {
      throw "Could not find repo root above $StartDir"
    }
    $dir = $parent
  }
}

function Resolve-DefaultSourcePath {
  param([string]$RepoRoot)
  $downloadsDir = [Environment]::GetFolderPath('UserProfile')
  $downloadsDir = Join-Path $downloadsDir 'Downloads'
  $candidates = @()
  if (Test-Path -LiteralPath $downloadsDir) {
    $candidates += Get-ChildItem -LiteralPath $downloadsDir -Filter 'seedOverrides*.json' -File -ErrorAction SilentlyContinue
  }
  $candidates += Get-ChildItem -LiteralPath $RepoRoot -Filter 'seedOverrides*.json' -File -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notlike '*\.git\*' -and $_.FullName -notlike '*\node_modules\*' }
  $pick = $candidates | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
  if (-not $pick) {
    throw 'No exported seedOverrides JSON file was found. Pass -SourcePath explicitly.'
  }
  return $pick.FullName
}

function ConvertFrom-JsonObject {
  param([Parameter(Mandatory = $true)] [string]$JsonText)
  $parsed = $JsonText | ConvertFrom-Json
  if ($null -eq $parsed -or $parsed -isnot [psobject]) {
    throw 'Exported file must contain a top-level JSON object keyed by home ID.'
  }
  return $parsed
}

function ConvertTo-SortedHashtable {
  param([Parameter(Mandatory = $true)] [object]$Value)
  if ($null -eq $Value) { return $null }
  if ($Value -is [string] -or $Value -is [bool] -or $Value -is [int] -or $Value -is [long] -or $Value -is [double] -or $Value -is [decimal]) {
    return $Value
  }
  if ($Value -is [System.Array]) {
    return @($Value | ForEach-Object { ConvertTo-SortedHashtable $_ })
  }
  if ($Value -is [pscustomobject] -or $Value -is [hashtable]) {
    $sorted = [ordered]@{}
    foreach ($name in ($Value.PSObject.Properties.Name | Sort-Object)) {
      $sorted[$name] = ConvertTo-SortedHashtable $Value.$name
    }
    return $sorted
  }
  return $Value
}

function Invoke-Git {
  param(
    [Parameter(Mandatory = $true)] [string]$RepoRoot,
    [Parameter(Mandatory = $true)] [string[]]$Arguments
  )
  & git -C $RepoRoot @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "git $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
  }
}

function Test-GitDiff {
  param(
    [Parameter(Mandatory = $true)] [string]$RepoRoot,
    [Parameter(Mandatory = $true)] [string[]]$Arguments
  )
  & git -C $RepoRoot @Arguments | Out-Null
  return ($LASTEXITCODE -ne 0)
}

$repoRoot = Resolve-RepoRoot -StartDir $PSScriptRoot
$targetPath = Join-Path $repoRoot 'src\data\seedOverrides.json'
$targetRelativePath = 'src/data/seedOverrides.json'
if (-not $SourcePath) {
  $SourcePath = Resolve-DefaultSourcePath -RepoRoot $repoRoot
}

if ($Push -and -not $Commit) {
  $Commit = $true
}

$resolvedSource = Resolve-Path -LiteralPath $SourcePath
if ($resolvedSource.Path -eq $targetPath) {
  Write-Output "Source is already $targetPath"
}

$jsonText = Get-Content -Raw -LiteralPath $resolvedSource
$parsed = ConvertFrom-JsonObject -JsonText $jsonText
$sorted = ConvertTo-SortedHashtable $parsed
$output = ($sorted | ConvertTo-Json -Depth 100) + "`n"
[System.IO.File]::WriteAllText($targetPath, $output, [System.Text.UTF8Encoding]::new($false))

$homeCount = @($sorted.Keys).Count
Write-Output "Updated $targetPath from $resolvedSource"
Write-Output "Home override records: $homeCount"

if ($Stage) {
  Invoke-Git -RepoRoot $repoRoot -Arguments @('add', '--', $targetRelativePath)
  Write-Output 'Staged src/data/seedOverrides.json'
}

if ($Commit) {
  Invoke-Git -RepoRoot $repoRoot -Arguments @('add', '--', $targetRelativePath)
  $hasCachedTargetDiff = Test-GitDiff -RepoRoot $repoRoot -Arguments @('diff', '--cached', '--quiet', '--', $targetRelativePath)
  if ($hasCachedTargetDiff) {
    Invoke-Git -RepoRoot $repoRoot -Arguments @('commit', '--only', '--message', $CommitMessage, '--', $targetRelativePath)
    Write-Output "Committed $targetRelativePath"
  } else {
    Write-Output "No committed changes detected for $targetRelativePath"
  }
}

if ($Push) {
  Invoke-Git -RepoRoot $repoRoot -Arguments @('push', 'origin', 'HEAD')
  Write-Output 'Pushed current HEAD to origin'
}

if (-not $Commit -and -not $Push) {
  Write-Output 'Next: review with `git diff -- src/data/seedOverrides.json` and commit when ready.'
}
