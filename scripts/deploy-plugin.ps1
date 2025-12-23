<#
.SYNOPSIS
    Claude Code 插件批量部署脚本
    读取 .claude-plugin/marketplace.json 配置，将插件同步到本地 Claude 插件缓存目录。
    仅更新已安装的插件，不会自动安装新插件。

.DESCRIPTION
    1. 读取项目根目录下的 .claude-plugin/marketplace.json
    2. 遍历所有配置的插件
    3. 检查本地是否安装了对应版本的插件
    4. 如果已安装，则同步 scripts, tests, config, hooks 目录
    5. 如果版本不匹配或未安装，则跳过并提示
#>

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# 获取脚本所在目录和项目根目录
$ScriptDir = $PSScriptRoot
$ProjectRoot = Split-Path -Parent $ScriptDir
$MarketplaceJsonPath = Join-Path $ProjectRoot ".claude-plugin\marketplace.json"

# 检查 marketplace.json 是否存在
if (-not (Test-Path $MarketplaceJsonPath)) {
    Write-Host "❌ 错误：找不到 marketplace.json 配置文件" -ForegroundColor Red
    Write-Host "   路径: $MarketplaceJsonPath"
    exit 1
}

# 读取并解析 marketplace.json
try {
    $MarketplaceContent = Get-Content $MarketplaceJsonPath -Raw -Encoding UTF8
    $MarketplaceData = $MarketplaceContent | ConvertFrom-Json
} catch {
    Write-Host "❌ 解析 marketplace.json 失败: $_" -ForegroundColor Red
    exit 1
}

$MarketplaceName = $MarketplaceData.name
if ([string]::IsNullOrWhiteSpace($MarketplaceName)) {
    Write-Host "❌ 错误：marketplace.json 中缺少 'name' 字段 (市场名称)" -ForegroundColor Red
    exit 1
}

Write-Host "================================="
Write-Host "Claude Code 插件自动部署脚本"
Write-Host "插件市场: $MarketplaceName"
Write-Host "================================="
Write-Host ""

# Claude 插件缓存根目录
$ClaudeBaseDir = Join-Path $env:USERPROFILE ".claude\plugins\cache"
$MarketplaceDestDir = Join-Path $ClaudeBaseDir $MarketplaceName

# 同步目录函数
function Sync-Directory {
    param (
        [string]$Source,
        [string]$Destination
    )

    if (-not (Test-Path $Source)) {
        return
    }
    
    # 获取源目录下的所有文件
    $Files = Get-ChildItem -Path $Source -Recurse -File

    foreach ($File in $Files) {
        # 计算相对路径
        $RelPath = $File.FullName.Substring($Source.Length)
        if ($RelPath.StartsWith("\")) { $RelPath = $RelPath.Substring(1) }
        
        # 构建目标路径
        $DestFile = Join-Path $Destination $RelPath
        $DestDir = Split-Path -Parent $DestFile

        # 如果目标子目录不存在，则创建（这是为了同步新添加的文件结构，不是创建插件根目录）
        if (-not (Test-Path $DestDir)) {
            New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
        }

        # 复制文件 (强制覆盖)
        Copy-Item -Path $File.FullName -Destination $DestFile -Force
    }
    Write-Host "   ✓ 已同步 $(Split-Path $Source -Leaf)" -ForegroundColor Green
}

# 部署单个插件函数
function Deploy-Plugin {
    param (
        [string]$PluginName,
        [string]$PluginSourceRelPath
    )

    # 处理源码路径 (移除可能的 ./ 前缀)
    if ($PluginSourceRelPath.StartsWith("./") -or $PluginSourceRelPath.StartsWith(".\")) {
        $PluginSourceRelPath = $PluginSourceRelPath.Substring(2)
    }
    $PluginSourceFull = Join-Path $ProjectRoot $PluginSourceRelPath

    Write-Host "正在处理插件: $PluginName"

    # 检查源码目录是否存在
    if (-not (Test-Path $PluginSourceFull)) {
        Write-Host "   ❌ 源码目录不存在: $PluginSourceFull" -ForegroundColor Red
        return
    }

    # 从 plugin.json 读取版本号
    $PluginJsonPath = Join-Path $PluginSourceFull ".claude-plugin\plugin.json"
    if (-not (Test-Path $PluginJsonPath)) {
        Write-Host "   ❌ 找不到 plugin.json: $PluginJsonPath" -ForegroundColor Red
        return
    }

    try {
        $PluginJson = Get-Content $PluginJsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
        $DevVersion = $PluginJson.version
    } catch {
        Write-Host "   ❌ 读取 plugin.json 版本号失败" -ForegroundColor Red
        return
    }

    if ([string]::IsNullOrWhiteSpace($DevVersion)) {
        Write-Host "   ❌ plugin.json 中缺少 'version' 字段" -ForegroundColor Red
        return
    }

    # 构建目标路径
    # 路径格式: ~/.claude/plugins/cache/<MarketplaceName>/<PluginName>/<Version>
    $PluginDestBase = Join-Path $MarketplaceDestDir $PluginName
    $TargetDestDir = Join-Path $PluginDestBase $DevVersion

    # 检查目标版本目录是否存在
    if (Test-Path $TargetDestDir) {
        # 同步关键目录
        $DirsToSync = @("scripts", "tests", "config", "hooks")
        foreach ($DirName in $DirsToSync) {
            $SrcDir = Join-Path $PluginSourceFull $DirName
            $DstDir = Join-Path $TargetDestDir $DirName
            Sync-Directory -Source $SrcDir -Destination $DstDir
        }
        Write-Host "   ✅ 部署完成 ($PluginName v$DevVersion)" -ForegroundColor Cyan
    } else {
        # 如果目标版本不存在，检查是否安装了其他版本
        if (Test-Path $PluginDestBase) {
            $InstalledVersions = Get-ChildItem -Path $PluginDestBase -Directory | Select-Object -ExpandProperty Name
            Write-Host "   ❌ 版本不一致！" -ForegroundColor Red
            Write-Host "      开发版本: $DevVersion" -ForegroundColor Red
            Write-Host "      安装版本: $($InstalledVersions -join ', ')" -ForegroundColor Red
        } else {
            Write-Host "   ⚠️  插件未安装 (未找到目录: $PluginDestBase)" -ForegroundColor Yellow
        }
    }
    Write-Host ""
}

# 主循环：遍历 marketplace.json 中的所有插件
foreach ($Plugin in $MarketplaceData.plugins) {
    Deploy-Plugin -PluginName $Plugin.name -PluginSourceRelPath $Plugin.source
}

Write-Host "所有操作已完成。"
