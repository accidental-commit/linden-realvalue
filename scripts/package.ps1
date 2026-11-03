# scripts/package.ps1
param(
    [ValidateSet("All", "Chrome", "Firefox")]
    [string]$Target = "All"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Create-ExtensionZip([string]$zipName, [string]$manifestPath) {
    if (Test-Path $zipName) {
        Remove-Item -Path $zipName -Force
    }
    
    $zip = [System.IO.Compression.ZipFile]::Open($zipName, 'Create')
    try {
        # Add manifest as 'manifest.json'
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, (Resolve-Path $manifestPath), "manifest.json") | Out-Null
        
        # Add common root files
        $commonFiles = @('background.js', 'content.js', 'popup.html', 'popup.js', 'styles.css', 'rate.json')
        foreach ($f in $commonFiles) {
            if (Test-Path $f) {
                [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, (Resolve-Path $f), $f) | Out-Null
            }
        }
        
        # Add icons folder
        if (Test-Path 'icons') {
            Get-ChildItem -Path 'icons' | ForEach-Object {
                $entryName = "icons/" + $_.Name
                [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $entryName) | Out-Null
            }
        }
    }
    finally {
        $zip.Dispose()
    }
    
    $info = Get-Item $zipName
    Write-Host "Created: $($info.Name) ($([math]::Round($info.Length / 1KB, 1)) KB)" -ForegroundColor Green
}

$rootDir = Split-Path -Parent $PSScriptRoot
Set-Location $rootDir

if ($Target -eq "All" -or $Target -eq "Chrome") {
    Create-ExtensionZip "linden-realvalue-chrome.zip" "manifest.json"
}

if ($Target -eq "All" -or $Target -eq "Firefox") {
    Create-ExtensionZip "linden-realvalue-firefox.zip" "manifest.firefox.json"
}
