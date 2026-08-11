param(
  [ValidateSet("nsis", "msi")]
  [string]$Package = "nsis",
  [string]$InstallerPath = ""
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$OutputDir = Join-Path $RepoRoot "output"
$SampleMasterCanvasProject = Join-Path $OutputDir "installer-smoke.mastercanvas"
$SampleMcProject = Join-Path $OutputDir "installer-smoke.mcproject"
$RegisteredProgIds = @()

function Stop-MasterCanvas {
  Get-Process -Name "master-canvas" -ErrorAction SilentlyContinue | Stop-Process -Force
  Start-Sleep -Milliseconds 500
}

function Invoke-InstallerProcess {
  param(
    [string]$FilePath,
    [string]$Arguments,
    [int[]]$AllowedExitCodes = @(0)
  )

  $process = Start-Process -FilePath $FilePath -ArgumentList $Arguments -PassThru -Wait
  if ($AllowedExitCodes -notcontains $process.ExitCode) {
    throw "$FilePath failed with exit code $($process.ExitCode)"
  }
  return $process.ExitCode
}

function Get-MasterCanvasInstallEntry {
  Get-ItemProperty -Path `
    "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*", `
    "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*", `
    "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*" `
    -ErrorAction SilentlyContinue |
    Where-Object { $_.DisplayName -eq "Master Canvas" } |
    Select-Object -First 1
}

function Resolve-InstalledExe {
  param($Entry)

  $candidates = @()
  if ($Entry.DisplayIcon) {
    $candidates += (($Entry.DisplayIcon -replace ",\d+$", "").Trim('"'))
  }
  if ($Entry.InstallLocation) {
    $installLocation = $Entry.InstallLocation.Trim('"')
    $candidates += Join-Path $installLocation "master-canvas.exe"
    $candidates += Join-Path $installLocation "Master Canvas.exe"
  }
  $candidates += Join-Path $env:LOCALAPPDATA "Master Canvas\master-canvas.exe"

  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path -LiteralPath $candidate)) {
      return (Resolve-Path -LiteralPath $candidate).Path
    }
  }
  throw "Installed master-canvas.exe was not found"
}

function Get-DefaultRegValue {
  param([string]$Key)

  $result = & reg query $Key /ve 2>$null
  $line = $result | Select-String "REG_SZ" | Select-Object -First 1
  if (-not $line) { return "" }
  return $line.ToString().Split("REG_SZ")[-1].Trim()
}

function Write-SampleProjects {
  New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
  $project = @{
    id = "installer-smoke"
    title = "Installer smoke - file association"
    view = @{ x = 520; y = 230; scale = 0.9 }
    nodes = @(
      @{
        id = "node-installer-smoke"
        type = "note"
        x = 0
        y = 0
        w = 360
        h = 180
        title = "File association opened"
        notes = "Local project file for installer regression."
        tags = "installer-smoke, file-association"
        status = "ready"
      }
    )
    assets = @()
    continuity = @{}
    createdAt = (Get-Date).ToString("o")
    updatedAt = (Get-Date).ToString("o")
  }
  $json = $project | ConvertTo-Json -Depth 10
  $json | Set-Content -LiteralPath $SampleMasterCanvasProject -Encoding UTF8
  $json | Set-Content -LiteralPath $SampleMcProject -Encoding UTF8
}

function Assert-FileAssociation {
  param(
    [string]$InstalledExe,
    [ValidateSet(".mastercanvas", ".mcproject")]
    [string]$Extension,
    [string]$SamplePath
  )

  $progId = Get-DefaultRegValue "HKCU\Software\Classes\$Extension"
  if (-not $progId) {
    throw "$Extension file association was not registered"
  }
  if ($script:RegisteredProgIds -notcontains $progId) {
    $script:RegisteredProgIds += $progId
  }

  $openCommand = Get-DefaultRegValue "HKCU\Software\Classes\$progId\shell\open\command"
  if (-not $openCommand -or -not $openCommand.Contains("master-canvas.exe")) {
    throw "$Extension open command is missing or invalid: $openCommand"
  }

  Stop-MasterCanvas
  Start-Process -FilePath $SamplePath
  Start-Sleep -Seconds 8
  $process = Get-Process -Name "master-canvas" -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $process) {
    throw "Opening $Extension did not launch Master Canvas"
  }
  if (-not $process.Responding) {
    throw "Master Canvas launched from $Extension but is not responding"
  }
  if ((Resolve-Path -LiteralPath $process.Path).Path -ne (Resolve-Path -LiteralPath $InstalledExe).Path) {
    throw "File association launched unexpected executable: $($process.Path)"
  }
}

function Assert-WritablePath {
  param([string]$Path)

  $existed = Test-Path -LiteralPath $Path
  New-Item -ItemType Directory -Force -Path $Path | Out-Null
  $probe = Join-Path $Path "master-canvas-installer-permission-smoke.tmp"
  "permission-smoke $(Get-Date -Format o)" | Set-Content -LiteralPath $probe -Encoding UTF8
  $content = Get-Content -LiteralPath $probe -Raw
  if (-not $content.Contains("permission-smoke")) {
    throw "Permission probe could not read back from: $Path"
  }
  Remove-Item -LiteralPath $probe -Force
  if (-not $existed) {
    Remove-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
  }
}

function Assert-FirstLaunchAndPathPermissions {
  param([string]$InstalledExe)

  Stop-MasterCanvas
  Start-Process -FilePath $InstalledExe | Out-Null
  Start-Sleep -Seconds 8
  $process = Get-Process -Name "master-canvas" -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $process) {
    throw "First launch did not start Master Canvas"
  }
  if (-not $process.Responding) {
    throw "Master Canvas first launch is not responding"
  }
  if ((Resolve-Path -LiteralPath $process.Path).Path -ne (Resolve-Path -LiteralPath $InstalledExe).Path) {
    throw "First launch used unexpected executable: $($process.Path)"
  }

  Assert-WritablePath (Join-Path $env:LOCALAPPDATA "studio.mastercanvas.desktop")
  Assert-WritablePath (Join-Path ([Environment]::GetFolderPath("MyDocuments")) "MasterCanvas")
}

function Uninstall-MasterCanvas {
  param($Entry)

  if ($Package -eq "msi") {
    $productCode = $Entry.PSChildName
    if (-not $productCode -or -not $productCode.StartsWith("{")) {
      $productCode = "{8F951252-646B-4B7F-9D9E-4EE0BB6567B8}"
    }
    Invoke-InstallerProcess "msiexec.exe" "/x $productCode /qn /norestart" | Out-Null
    return
  }

  $uninstall = $Entry.UninstallString.Trim([char]34)
  if (-not (Test-Path -LiteralPath $uninstall)) {
    throw "NSIS uninstaller was not found: $uninstall"
  }
  Invoke-InstallerProcess $uninstall "/S" | Out-Null
}

function Assert-UninstalledCleanly {
  $entry = Get-MasterCanvasInstallEntry
  if ($entry) { throw "Uninstall entry still exists" }
  if (Test-Path -LiteralPath (Join-Path $env:LOCALAPPDATA "Master Canvas")) {
    throw "Install directory still exists"
  }
  if (Test-Path -LiteralPath "HKCU:\Software\Classes\.mastercanvas") {
    throw ".mastercanvas registry key still exists"
  }
  if (Test-Path -LiteralPath "HKCU:\Software\Classes\.mcproject") {
    throw ".mcproject registry key still exists"
  }
  foreach ($progId in $script:RegisteredProgIds) {
    if ($progId -and (Test-Path -LiteralPath "HKCU:\Software\Classes\$progId")) {
      throw "File association ProgID registry key still exists: $progId"
    }
  }
}

if (-not $InstallerPath) {
  if ($Package -eq "nsis") {
    $InstallerPath = Join-Path $RepoRoot "src-tauri\target\release\bundle\nsis\Master Canvas_2.0.0_x64-setup.exe"
  } else {
    $InstallerPath = Join-Path $RepoRoot "src-tauri\target\release\bundle\msi\Master Canvas_2.0.0_x64_en-US.msi"
  }
}

if (-not (Test-Path -LiteralPath $InstallerPath)) {
  throw "Installer not found: $InstallerPath"
}

Write-SampleProjects
Stop-MasterCanvas

if ($Package -eq "nsis") {
  Invoke-InstallerProcess $InstallerPath "/S" | Out-Null
} else {
  Invoke-InstallerProcess "msiexec.exe" "/i `"$InstallerPath`" /qn /norestart ALLUSERS=2 MSIINSTALLPERUSER=1" | Out-Null
}

$entry = Get-MasterCanvasInstallEntry
if (-not $entry) { throw "Master Canvas install entry was not created" }
$installedExe = Resolve-InstalledExe $entry
Assert-FirstLaunchAndPathPermissions $installedExe
Assert-FileAssociation $installedExe ".mastercanvas" $SampleMasterCanvasProject
Assert-FileAssociation $installedExe ".mcproject" $SampleMcProject

Stop-MasterCanvas
Uninstall-MasterCanvas $entry
Start-Sleep -Seconds 2
Assert-UninstalledCleanly

[pscustomobject]@{
  Package = $Package
  Installer = $InstallerPath
  InstalledExe = $installedExe
  FirstLaunchPathPermissions = "passed"
  MasterCanvasAssociation = "passed"
  McProjectAssociation = "passed"
  UninstallCleanup = "passed"
}
