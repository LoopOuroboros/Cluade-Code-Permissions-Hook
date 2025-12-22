@echo off
REM Claude Code 插件自动部署脚本
REM 使用方法：
REM   deploy-plugin.bat                          - 使用默认配置（bash-permission-hook）
REM   deploy-plugin.bat MyPlugin MyMarketplace   - 指定插件名和市场名

echo ================================
echo Claude Code 插件自动部署脚本
echo ================================
echo.

REM 设置默认值（如果没有参数）
if "%1"=="" (
    set "PLUGIN_NAME=bash-permission-hook"
    set "MARKETPLACE_NAME=claude-code-permissions-hook"
) else (
    set "PLUGIN_NAME=%1"
)

if "%2"=="" (
    set "MARKETPLACE_NAME=claude-code-permissions-hook"
) else (
    set "MARKETPLACE_NAME=%2"
)

echo 配置信息：
echo   插件名称：%PLUGIN_NAME%
echo   市场名称：%MARKETPLACE_NAME%
echo.

REM 定义路径
set "PLUGIN_SOURCE=.\%PLUGIN_NAME%"

REM 从 plugin.json 读取版本号
set "PLUGIN_VERSION="

REM 查找 plugin.json
if exist "%PLUGIN_SOURCE%\.claude-plugin\plugin.json" (
    echo 正在从 .claude-plugin/plugin.json 读取版本信息...
    for /f "usebackq tokens=2 delims=:" %%v in (`type "%PLUGIN_SOURCE%\.claude-plugin\plugin.json" 2^>nul ^| findstr "version"`) do (
        set "PLUGIN_VERSION=%%v"
    )
    if "%PLUGIN_VERSION%"=="" (
        echo   警告：未找到 version 字段，使用默认值 1.0.0
        set "PLUGIN_VERSION=1.0.0"
    )
) else (
    echo   警告：未找到 plugin.json，使用默认值 1.0.0
    set "PLUGIN_VERSION=1.0.0"
)

REM 清理版本号（移除引号、逗号、空格）
set "PLUGIN_VERSION=%PLUGIN_VERSION:\"=%"
set "PLUGIN_VERSION=%PLUGIN_VERSION:,=%"
set "PLUGIN_VERSION=%PLUGIN_VERSION: =%"
set "PLUGIN_VERSION=%PLUGIN_VERSION:,=%"

REM 仍然有残留字符时的清理
if defined PLUGIN_VERSION (
    set "PLUGIN_VERSION=%PLUGIN_VERSION:}=%"
    set "PLUGIN_VERSION=%PLUGIN_VERSION:{=%
)

REM 插件实际运行目录
set "PLUGIN_DEST=%USERPROFILE%\.claude\plugins\cache\%MARKETPLACE_NAME%\%PLUGIN_NAME%\%PLUGIN_VERSION%"

echo.
echo 部署信息：
echo   源目录：%PLUGIN_SOURCE%
echo   目标目录：%PLUGIN_DEST%
echo   版本号：%PLUGIN_VERSION%
echo.

REM 检查源目录是否存在
if not exist "%PLUGIN_SOURCE%" (
    echo.
    echo ❌ 错误：项目目录不存在！
    echo   %PLUGIN_SOURCE%
    echo.
    echo 请确保在正确的项目根目录运行此脚本！
    echo.
    pause
    exit /b 1
)

REM 检查目标目录是否存在
if not exist "%PLUGIN_DEST%" (
    echo.
    echo ❌ 错误：插件目录不存在！
    echo   %PLUGIN_DEST%
    echo.
    echo 请确保插件已正确安装到 Claude Code 中！
    echo.
    echo 提示：可以通过以下命令查看已安装的插件：
    echo   type "%USERPROFILE%\.claude\plugins\installed_plugins.json"
    echo.
    pause
    exit /b 1
)

echo ✓ 目录验证完成
echo.
echo 开始同步文件...
echo.

REM 计数器
set /a success_count=0
set /a warn_count=0

REM 同步关键目录
echo -> 同步 scripts 目录
if not exist "%PLUGIN_SOURCE%\scripts\" (
    echo    ❌ scripts 目录不存在，跳过
    set /a warn_count+=1
) else (
    xcopy "%PLUGIN_SOURCE%\scripts\*" "%PLUGIN_DEST%\scripts\" /Y /Q /E 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo    ✓ scripts 同步成功
        set /a success_count+=1
    ) else (
        echo    ⚠ scripts 同步有问题或文件已存在
        set /a warn_count+=1
    )
)

echo -> 同步 tests 目录
if not exist "%PLUGIN_SOURCE%\tests\" (
    echo    ❌ tests 目录不存在，跳过
    set /a warn_count+=1
) else (
    xcopy "%PLUGIN_SOURCE%\tests\*" "%PLUGIN_DEST%\tests\" /Y /Q /E 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo    ✓ tests 同步成功
        set /a success_count+=1
    ) else (
        echo    ⚠ tests 同步有问题或文件已存在
        set /a warn_count+=1
    )
)

echo -> 同步 config 目录（如果存在）
if not exist "%PLUGIN_SOURCE%\config\" (
    echo    ○ config 目录不存在，跳过
) else (
    xcopy "%PLUGIN_SOURCE%\config\*" "%PLUGIN_DEST%\config\" /Y /Q /E 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo    ✓ config 同步成功
        set /a success_count+=1
    ) else (
        echo    ⚠ config 同步有问题或文件已存在
        set /a warn_count+=1
    )
)

echo -> 同步 hooks 目录（如果存在）
if not exist "%PLUGIN_SOURCE%\hooks\" (
    echo    ○ hooks 目录不存在，跳过
) else (
    xcopy "%PLUGIN_SOURCE%\hooks\*" "%PLUGIN_DEST%\hooks\" /Y /Q /E 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo    ✓ hooks 同步成功
        set /a success_count+=1
    ) else (
        echo    ⚠ hooks 同步有问题或文件已存在
        set /a warn_count+=1
    )
)

echo.
echo ================================
echo 部署完成！
echo ================================
echo.
echo 统计信息：
echo   ✓ 成功同步目录：%success_count% 个
echo   ⚠ 警告数量：%warn_count% 个
echo.

echo ================================
echo 部署完成！
echo ================================