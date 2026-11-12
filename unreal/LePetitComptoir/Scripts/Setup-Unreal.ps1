[CmdletBinding()]
param(
    [string]$EngineRoot = 'C:\Program Files\Epic Games\UE_5.8',
    [switch]$OpenEditor,
    [switch]$VerifyTablet,
    [switch]$VerifyUI,
    [switch]$VerifyGraphics
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

Write-Host '2/3 Preparation des assets, polices et mise a jour du decor...'
& $Commandlet $Project '-run=pythonscript' "-script=$Bootstrap" '-unattended' '-nop4' '-NullRHI' '-UTF8Output'
if ($LASTEXITCODE -ne 0) { throw "Creation des assets echouee (code $LASTEXITCODE). Consultez Saved\Logs." }
foreach ($Relative in @('Content\Maps\ComptoirOriginal.umap', 'Content\Original\Materials\M_Original_00.uasset', 'Content\Original\UI\T_ComptoirLogo.uasset', 'Content\Original\Fonts\F_ComptoirWorld.uasset', 'Content\Original\Materials\M_ComptoirText.uasset', 'Content\Original\Materials\M_Original_16.uasset')) {
    if (-not (Test-Path -LiteralPath (Join-Path $ProjectDirectory $Relative))) {
        throw "Asset manquant : $Relative. Consultez Saved\Logs."
    }
}

if ($VerifyTablet -or $VerifyUI -or $VerifyGraphics) {
    Write-Host 'Verification du rendu reel, des materiaux et interfaces (GPU requis)...'
    $TestFilter = if ($VerifyUI -or ($VerifyTablet -and $VerifyGraphics)) { 'LePetitComptoir' } elseif ($VerifyGraphics) { 'LePetitComptoir.Graphics.MaterialsAndViews' } else { 'LePetitComptoir.Tablet.RenderedText' }
    $ReportDirectory = Join-Path $ProjectDirectory ('Saved\Tests\RenderReport-' + [Guid]::NewGuid().ToString('N'))
    $RenderStartedUtc = [DateTime]::UtcNow
    & $Commandlet $Project '-unattended' '-nop4' '-nosound' '-RenderOffscreen' '-UTF8Output' `
        "-ExecCmds=Automation RunTests $TestFilter" `
        '-TestExit=Automation Test Queue Empty' "-ReportExportPath=$ReportDirectory"
    $RenderExitCode = $LASTEXITCODE
    $ReportFile = Join-Path $ReportDirectory 'index.json'
    if (-not (Test-Path -LiteralPath $ReportFile)) { throw "Rapport de test absent (code Unreal $RenderExitCode) : $ReportFile. Consultez Saved\Logs." }
    $Report = Get-Content -LiteralPath $ReportFile -Raw | ConvertFrom-Json
    $Failures = @($Report.tests | Where-Object { $_.state -ne 'Success' })
    if ($Failures.Count -gt 0) {
        $Details = @()
        foreach ($Failure in $Failures) {
            $Details += "$($Failure.fullTestPath) : $($Failure.state)"
            foreach ($Entry in @($Failure.entries)) {
                if ($Entry.event.type -in @('Error', 'Warning', 'Info')) {
                    $Details += "  [$($Entry.event.type)] $($Entry.event.message)"
                }
            }
        }
        $SummaryFile = Join-Path $ReportDirectory 'failures.txt'
        $Details | Set-Content -LiteralPath $SummaryFile -Encoding UTF8
        $Details | ForEach-Object { Write-Host $_ }
        # Keep this run's images with its report; never attach stale captures.
        try {
            $DiagnosticFiles = @($ReportFile, $SummaryFile)
            foreach ($CaptureFolder in @('Tablet', 'WorldText', 'Drinks', 'Graphics')) {
                $CaptureDirectory = Join-Path $ProjectDirectory ('Saved\Tests\' + $CaptureFolder)
                if (Test-Path -LiteralPath $CaptureDirectory) {
                    $DiagnosticFiles += @(Get-ChildItem -LiteralPath $CaptureDirectory -File -Recurse |
                        Where-Object { $_.Extension -in @('.bmp', '.png') -and $_.LastWriteTimeUtc -ge $RenderStartedUtc } |
                        ForEach-Object { $_.FullName })
                }
            }
            $DiagnosticArchive = Join-Path $ReportDirectory 'diagnostics.zip'
            Compress-Archive -LiteralPath $DiagnosticFiles -DestinationPath $DiagnosticArchive -CompressionLevel Optimal
            Write-Host "Rapport et captures de cette execution : $DiagnosticArchive"
        } catch {
            Write-Warning "Archive de diagnostic non creee : $($_.Exception.Message). Les fichiers restent disponibles dans Saved\Tests."
        }
        throw "Tests de rendu en echec. Details : $SummaryFile. Rapport complet : $ReportFile"
    }
    if ($RenderExitCode -ne 0) { throw "Unreal s'est termine en erreur (code $RenderExitCode). Rapport : $ReportFile. Consultez Saved\Logs." }
    $ExpectedTests = @()
    if ($VerifyTablet -or $VerifyUI) { $ExpectedTests += 'LePetitComptoir.Tablet.RenderedText' }
    if ($VerifyGraphics -or $VerifyUI) { $ExpectedTests += 'LePetitComptoir.Graphics.MaterialsAndViews' }
    if ($VerifyUI) { $ExpectedTests += @('LePetitComptoir.World.FontGlyphs', 'LePetitComptoir.World.RenderedText', 'LePetitComptoir.Session.SaveMetadata', 'LePetitComptoir.Drinks.GoldenBeer') }
    foreach ($Expected in $ExpectedTests) {
        $Result = @($Report.tests | Where-Object { $_.fullTestPath -eq $Expected })
        if ($Result.Count -ne 1 -or $Result[0].state -ne 'Success') {
            throw "Le test $Expected n'a pas reussi. Rapport : $ReportFile"
        }
    }
    Write-Host 'Rendu verifie. Captures : Saved\Tests\Tablet, WorldText, Drinks et Graphics.'
}

Write-Host '3/3 Projet pret. Ouvrez LePetitComptoir.uproject puis Play dans Maps/ComptoirOriginal.'
Write-Host 'Les assets generes doivent ensuite etre ajoutes a Git avec Git LFS actif.'
if ($OpenEditor) { Start-Process -FilePath $Editor -ArgumentList ('"' + $Project + '"') }
