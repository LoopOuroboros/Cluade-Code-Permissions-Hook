# Set output encoding to UTF-8 to handle Chinese characters correctly in console
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "================================"
Write-Host "Claude Code 插件批量部署脚本 (PowerShell)"
Write-Host "================================"
Write-Host ""

# Determine Project Root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectRoot = Split-Path -Parent $ScriptDir
$MarketplaceJsonPath = Join-Path $ProjectRoot ".claude-plugin\marketplace.json"

# Check marketplace.json
if (-not (Test-Path $MarketplaceJsonPath)) {
    Write-Host "❌ 错误：未找到 marketplace.json 文件！" -ForegroundColor Red
    Write-Host "  预期路径: $MarketplaceJsonPath"
    exit 1
}

Write-Host "正在读取配置: $MarketplaceJsonPath"
try {
    $MarketplaceData = Get-Content $MarketplaceJsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
} catch {
    Write-Host "❌ 错误：解析 marketplace.json 失败！" -ForegroundColor Red
    Write-Host "  错误信息: $_"
    exit 1
}

$MarketplaceName = $MarketplaceData.name
if ([string]::IsNullOrWhiteSpace($MarketplaceName)) {
    Write-Host "❌ 错误：marketplace.json 中缺少 'name' 字段！" -ForegroundColor Red
    exit 1
}
$MarketplaceName = $MarketplaceName.ToLower()

Write-Host "市场名称: $MarketplaceName"
Write-Host "找到 $($MarketplaceData.plugins.Count) 个插件待处理..."
Write-Host ""

# Function to deploy a single plugin
function Deploy-Plugin {
    param (
        [string]$PluginName,
        [string]$PluginSourcePath,
        [string]$MarketplaceName,
        [string]$PluginVersion
    )

    Write-Host "--------------------------------------------------"
    Write-Host "正在处理插件: $PluginName"
    
    # Check Source
    if (-not (Test-Path $PluginSourcePath)) {
        Write-Host "❌ 错误：插件源码目录不存在！" -ForegroundColor Red
        Write-Host "  $PluginSourcePath"
        return
    }

    # Version is passed from marketplace.json
    $MarketplaceVersion = $PluginVersion
    $SourceVersion = $null

    # Validate version consistency with plugin.json
    $PluginJsonPath = Join-Path $PluginSourcePath ".claude-plugin\plugin.json"
    
    if (Test-Path $PluginJsonPath) {
        try {
            $JsonContent = Get-Content $PluginJsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($JsonContent.version) {
                $SourceVersion = $JsonContent.version
            }
        } catch {
            Write-Host "⚠️ 警告：无法解析 plugin.json 读取版本号" -ForegroundColor Yellow
        }
    }

    if ($SourceVersion -and ($SourceVersion -ne $MarketplaceVersion)) {
        Write-Host "❌ 错误：版本号不一致！" -ForegroundColor Red
        Write-Host "  marketplace.json 定义版本: $MarketplaceVersion"
        Write-Host "  plugin.json 实际版本:      $SourceVersion"
        Write-Host "  请修正版本号一致性后再试。"
        return
    }

    if (-not $SourceVersion) {
        Write-Host "⚠️ 警告：无法验证 plugin.json 版本号，将使用 marketplace.json 版本: $MarketplaceVersion" -ForegroundColor Yellow
    }

    $DevVersion = $MarketplaceVersion

    # Destination path setup
    $UserProfile = [System.Environment]::GetFolderPath('UserProfile')
    $MarketplaceDir = Join-Path $UserProfile ".claude\plugins\cache\$MarketplaceName"
    $PluginBaseDir = Join-Path $MarketplaceDir $PluginName
    $PluginDest = Join-Path $PluginBaseDir $DevVersion

    Write-Host "  开发版本：$DevVersion"
    Write-Host "  目标路径：$PluginDest"

    # Check Destination Existence and Version Match
    if (-not (Test-Path $PluginDest)) {
        Write-Host "❌ 错误：目标插件目录不存在！" -ForegroundColor Red
        
        if (Test-Path $PluginBaseDir) {
            $InstalledVersions = Get-ChildItem -Path $PluginBaseDir -Directory | Select-Object -ExpandProperty Name
            if ($InstalledVersions) {
                $InstalledVersionsStr = $InstalledVersions -join ", "
                Write-Host "❌ 插件 $PluginName 版本号不一致" -ForegroundColor Red
                Write-Host "   开发版本 = $DevVersion"
                Write-Host "   实际安装版本 = $InstalledVersionsStr"
            } else {
                Write-Host "❌ 插件 $PluginName 已安装但无版本目录 (空目录)" -ForegroundColor Red
            }
        } else {
            Write-Host "❌ 插件 $PluginName 未安装 (基础目录不存在)" -ForegroundColor Red
        }
        return
    }

    Write-Host "✓ 目标目录存在，开始同步..." -ForegroundColor Green

    $SuccessCount = 0
    $WarnCount = 0

    # Inner function for syncing directory
    function Sync-Directory {
        param (
            [string]$DirName,
            [string]$SourcePath,
            [string]$DestPath
        )
        
        $SrcDir = Join-Path $SourcePath $DirName
        $DstDir = Join-Path $DestPath $DirName
        
        # Write-Host "-> 同步 $DirName 目录"
        
        if (-not (Test-Path $SrcDir)) {
            # Write-Host "    ○ $DirName 目录不存在，跳过" -ForegroundColor Gray
            return $false
        }
        
        try {
            if (-not (Test-Path $DstDir)) {
                 New-Item -ItemType Directory -Force -Path $DstDir -ErrorAction Stop | Out-Null
            }
            
            Copy-Item -Path "$SrcDir\*" -Destination $DstDir -Recurse -Force -ErrorAction Stop
            Write-Host "    ✓ $DirName 同步成功" -ForegroundColor Green
            return $true
        } catch {
            Write-Host "    ⚠ $DirName 同步有问题: $_" -ForegroundColor Yellow
            return $null
        }
    }

    # Sync directories
    $DirsToSync = @("scripts", "tests", "config", "hooks", ".claude-plugin")
    foreach ($Dir in $DirsToSync) {
        $Result = Sync-Directory -DirName $Dir -SourcePath $PluginSourcePath -DestPath $PluginDest
        if ($Result -eq $true) { $SuccessCount++ }
        elseif ($Result -eq $null) { $WarnCount++ }
    }

    # Sync CLAUDE.md
    $ClaudeMdSrc = Join-Path $PluginSourcePath "CLAUDE.md"
    if (Test-Path $ClaudeMdSrc) {
        try {
            Copy-Item -Path $ClaudeMdSrc -Destination $PluginDest -Force -ErrorAction Stop
            Write-Host "    ✓ CLAUDE.md 同步成功" -ForegroundColor Green
        } catch {
            Write-Host "    ⚠ CLAUDE.md 同步失败: $_" -ForegroundColor Yellow
        }
    }
}

# Main Loop
foreach ($Plugin in $MarketplaceData.plugins) {
    $PName = $Plugin.name
    $PSource = $Plugin.source
    $PVersion = $Plugin.version
    
    # Resolve source path (handle ./ prefix if present)
    if ($PSource.StartsWith("./") -or $PSource.StartsWith(".\")) {
        $PSource = $PSource.Substring(2)
    }
    $FullSourcePath = Join-Path $ProjectRoot $PSource
    
    Deploy-Plugin -PluginName $PName -PluginSourcePath $FullSourcePath -MarketplaceName $MarketplaceName -PluginVersion $PVersion
}

Write-Host ""
Write-Host "================================"
Write-Host "所有任务处理完成！"
Write-Host "================================"
Write-Host ""


