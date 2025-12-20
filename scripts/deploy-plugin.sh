#!/bin/bash
# Claude Code 插件自动部署脚本 (Linux/macOS)
# 使用方法：在项目根目录运行 ./deploy-plugin.sh

echo "================================="
echo "Claude Code 插件自动部署脚本"
echo "================================="
echo

# 定义变量
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly PLUGIN_SOURCE="$PROJECT_ROOT/bash-permission-hook"
readonly PLUGIN_CONFIG="$PLUGIN_SOURCE/.claude-plugin/plugin.json"

# 从 plugin.json 读取版本号
if [ -f "$PLUGIN_CONFIG" ]; then
    PLUGIN_VERSION=$(grep '"version"' "$PLUGIN_CONFIG" | cut -d'"' -f4)
    if [ -z "$PLUGIN_VERSION" ]; then
        echo "错误：无法从 plugin.json 读取版本号"
        exit 1
    fi
else
    echo "错误：plugin.json 文件不存在：$PLUGIN_CONFIG"
    exit 1
fi

# 检测操作系统
OS="$(uname -s)"
case "$OS" in
    Darwin*)    PLUGIN_DEST="$HOME/.claude/plugins/cache/claude-code-permissions-hook/bash-permission-hook/$PLUGIN_VERSION" ;;
    Linux*)     PLUGIN_DEST="$HOME/.claude/plugins/cache/claude-code-permissions-hook/bash-permission-hook/$PLUGIN_VERSION" ;;
    CYGWIN*|MINGW*|MSYS*)
        echo "Windows 系统请使用 deploy-plugin.bat 脚本"
        exit 1
        ;;
    *)          echo "不支持的操作系统: $OS"; exit 1 ;;
esac

echo "项目根目录: $PROJECT_ROOT"
echo "插件源目录: $PLUGIN_SOURCE"
echo "插件版本: $PLUGIN_VERSION"
echo "插件目标目录: $PLUGIN_DEST"
echo

# 检查源目录是否存在
if [ ! -d "$PLUGIN_SOURCE" ]; then
    echo "错误：插件源目录不存在！"
    echo "$PLUGIN_SOURCE"
    exit 1
fi

# 检查目标目录是否存在
if [ ! -d "$PLUGIN_DEST" ]; then
    echo "错误：插件目标目录不存在！"
    echo "$PLUGIN_DEST"
    echo
    echo "请检查插件是否正确安装！"
    echo "查看 ~/.claude/plugins/installed_plugins.json"
    exit 1
fi

# 开始同步文件
echo "开始同步文件..."
echo

# 同步关键目录
sync_directory() {
    local src="$1"
    local dest="$2"
    local dir_name="$3"

    if [ -d "$src" ]; then
        echo "-> 同步 $dir_name 目录"
        rsync -av --delete "$src/" "$dest/" 2>/dev/null || {
            echo "   ⚠ rsync 不可用，尝试使用 cp"
            cp -rf "$src/"* "$dest/" 2>/dev/null || true
        }
        echo "   ✓ $dir_name 同步成功"
    else
        echo "   ⚠ $dir_name 目录不存在，跳过"
    fi
}

# 同步各个目录
sync_directory "$PLUGIN_SOURCE/scripts" "$PLUGIN_DEST/scripts" "scripts"
sync_directory "$PLUGIN_SOURCE/tests" "$PLUGIN_DEST/tests" "tests"
sync_directory "$PLUGIN_SOURCE/config" "$PLUGIN_DEST/config" "config"
sync_directory "$PLUGIN_SOURCE/hooks" "$PLUGIN_DEST/hooks" "hooks"

echo
echo "================================="
echo "部署完成！"
echo "================================="
echo

# 询问是否运行测试
echo -n "是否运行测试验证功能？(y/N): "
read -r choice
if [[ "$choice" =~ ^[Yy]$ ]]; then
    echo
    echo "正在运行测试套件..."
    echo
    cd "$PLUGIN_DEST" || exit 1
    if [ -f "tests/test.js" ]; then
        node tests/test.js
        if [ $? -eq 0 ]; then
            echo
            echo "✓ 测试运行成功！"
        else
            echo
            echo "⚠ 测试运行失败或出现错误！"
        fi
    else
        echo "测试文件不存在：tests/test.js"
    fi
fi

echo
echo "部署脚本执行完毕！"