[CmdletBinding()]
param(
    [string]$EngineRoot = 'C:\Program Files\Epic Games\UE_5.8',
    [switch]$OpenEditor
)
$ErrorActionPreference = 'Stop'
$ProjectDirectory = Split-Path -Parent $PSScriptRoot
$Project = Join-Path $ProjectDirectory 'LePetitComptoir.uproject'
$Build = Join-Path $EngineRoot 'Engine\Build\BatchFiles\Build.bat'
$Editor = Join-Path $EngineRoot 'Engine\Binaries\Win64\UnrealEditor.exe'
$Commandlet = Join-Path $EngineRoot 'Engine\Binaries\Win64\UnrealEditor-Cmd.exe'
$Bootstrap = Join-Path $PSScriptRoot 'bootstrap.py'
$SceneData = Join-Path $ProjectDirectory 'Content\OriginalData\scene.json'
$VersionFile = Join-Path $EngineRoot 'Engine\Build\Build.version'

foreach ($Path in @($Project, $Build, $Editor, $Commandlet, $VersionFile, $SceneData)) {
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Fichier introuvable : $Path. Precisez -EngineRoot avec votre dossier UE_5.8."
    }
}
$Version = Get-Content -LiteralPath $VersionFile -Raw | ConvertFrom-Json
if ($Version.MajorVersion -ne 5 -or $Version.MinorVersion -ne 8) {
    throw 'Ce projet cible Unreal 5.8. Utilisez la meme version sur vos deux ordinateurs.'
}
if ($Version.PatchVersion -ne 4) {
    Write-Warning "Version detectee : 5.8.$($Version.PatchVersion). La version cible du projet est 5.8.4."
}

Write-Host '1/3 Compilation C++ (Visual Studio avec Developpement de jeux en C++ requis)...'
& $Build 'LePetitComptoirEditor' 'Win64' 'Development' "-Project=$Project" '-WaitMutex' '-NoHotReloadFromIDE'
if ($LASTEXITCODE -ne 0) { throw "Compilation Unreal echouee (code $LASTEXITCODE). Consultez le journal ci-dessus." }

Write-Host '2/3 Preparation des assets et correction des axes du decor genere...'
& $Commandlet $Project '-run=pythonscript' "-script=$Bootstrap" '-unattended' '-nop4' '-NullRHI' '-UTF8Output'
if ($LASTEXITCODE -ne 0) { throw "Creation des assets echouee (code $LASTEXITCODE). Consultez Saved\Logs." }
foreach ($Relative in @('Content\Maps\ComptoirOriginal.umap', 'Content\Original\Materials\M_Original_00.uasset', 'Content\Original\UI\T_ComptoirLogo.uasset')) {
    if (-not (Test-Path -LiteralPath (Join-Path $ProjectDirectory $Relative))) {
        throw "Asset manquant : $Relative. Consultez Saved\Logs."
    }
}

Write-Host '3/3 Projet pret. Ouvrez LePetitComptoir.uproject puis Play dans Maps/ComptoirOriginal.'
Write-Host 'Les assets generes doivent ensuite etre ajoutes a Git avec Git LFS actif.'
if ($OpenEditor) { Start-Process -FilePath $Editor -ArgumentList ('"' + $Project + '"') }
