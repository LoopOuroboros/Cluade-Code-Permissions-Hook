#!/bin/bash
# Claude Code 插件批量部署脚本
# 读取 .claude-plugin/marketplace.json 配置，将插件同步到本地 Claude 插件缓存目录。

# 确保脚本抛出错误时停止
set -e

# 定义路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MARKETPLACE_JSON="$PROJECT_ROOT/.claude-plugin/marketplace.json"

echo "================================="
echo "Claude Code 插件自动部署脚本"
echo "================================="
echo

# 检查 marketplace.json
if [ ! -f "$MARKETPLACE_JSON" ]; then
    echo "❌ 错误：找不到 marketplace.json 配置文件"
    echo "   路径: $MARKETPLACE_JSON"
    exit 1
fi

# 转换路径为 Windows 兼容格式 (Mixed style D:/...) 以供 Node.js 使用
if command -v cygpath >/dev/null 2>&1; then
    MARKETPLACE_JSON_NODE=$(cygpath -m "$MARKETPLACE_JSON")
else
    MARKETPLACE_JSON_NODE="$MARKETPLACE_JSON"
fi

# 使用 Node.js 解析 JSON
# 输出格式: MARKETPLACE|名称
#          PLUGIN|名称|源码路径
PARSE_SCRIPT="
try {
    const fs = require('fs');
    const content = fs.readFileSync('$MARKETPLACE_JSON_NODE', 'utf8');
    const data = JSON.parse(content);
    console.log('MARKETPLACE|' + data.name);
    if (data.plugins && Array.isArray(data.plugins)) {
        data.plugins.forEach(p => {
            console.log('PLUGIN|' + p.name + '|' + p.source);
        });
    }
} catch (e) {
    console.error(e.message);
    process.exit(1);
}
"

# 临时文件保存解析结果
PARSED_DATA=$(node -e "$PARSE_SCRIPT")

# 获取市场名称
MARKETPLACE_NAME=$(echo "$PARSED_DATA" | grep "^MARKETPLACE|" | cut -d'|' -f2)

if [ -z "$MARKETPLACE_NAME" ]; then
    echo "❌ 错误：无法获取市场名称"
    exit 1
fi

echo "插件市场: $MARKETPLACE_NAME"
echo

# 确定基础目录
OS="$(uname -s)"
case "$OS" in
    Darwin*)    CLAUDE_BASE="$HOME/.claude/plugins/cache" ;;
    Linux*)     CLAUDE_BASE="$HOME/.claude/plugins/cache" ;;
    MINGW*|MSYS*|CYGWIN*) CLAUDE_BASE="$HOME/.claude/plugins/cache" ;; # Git Bash 通常映射 HOME
    *)          echo "不支持的操作系统: $OS"; exit 1 ;;
esac

MARKETPLACE_DEST_DIR="$CLAUDE_BASE/$MARKETPLACE_NAME"

# 同步目录函数
sync_directory() {
    local src="$1"
    local dest="$2"
    local dir_name="$3"

    if [ -d "$src" ]; then
        # 如果目标父目录不存在，说明结构有问题，但根据逻辑我们只在版本目录存在时同步
        # 这里假设 dest 已经是 .../version/subdir
        local dest_parent="$(dirname "$dest")"
        
        # 确保目标目录存在（rsync会自动创建，但cp需要）
        if [ ! -d "$dest" ]; then
            mkdir -p "$dest"
        fi

        # 使用 rsync 或 cp
        if command -v rsync >/dev/null 2>&1; then
            rsync -a --delete "$src/" "$dest/"
        else
            # 清空目标目录并复制
            rm -rf "$dest"/*
            cp -rf "$src/"* "$dest/"
        fi
        echo "   ✓ 已同步 $dir_name"
    fi
}

# 处理每个插件
echo "$PARSED_DATA" | grep "^PLUGIN|" | while IFS='|' read -r TYPE NAME SOURCE; do
    # 移除 ./ 前缀
    SOURCE_CLEAN=${SOURCE#./}
    PLUGIN_SOURCE_FULL="$PROJECT_ROOT/$SOURCE_CLEAN"
    
    echo "正在处理插件: $NAME"
    
    if [ ! -d "$PLUGIN_SOURCE_FULL" ]; then
        echo "   ❌ 源码目录不存在: $PLUGIN_SOURCE_FULL"
        continue
    fi
    
    # 读取版本号
    PLUGIN_JSON="$PLUGIN_SOURCE_FULL/.claude-plugin/plugin.json"
    if [ ! -f "$PLUGIN_JSON" ]; then
        echo "   ❌ 找不到 plugin.json"
        continue
    fi
    
    # 简单提取版本号 (假设格式标准)
    VERSION=$(grep '"version"' "$PLUGIN_JSON" | cut -d'"' -f4)
    
    if [ -z "$VERSION" ]; then
        echo "   ❌ 无法读取版本号"
        continue
    fi
    
    # 目标路径
    PLUGIN_DEST_BASE="$MARKETPLACE_DEST_DIR/$NAME"
    TARGET_DEST_DIR="$PLUGIN_DEST_BASE/$VERSION"
    
    if [ -d "$TARGET_DEST_DIR" ]; then
        # 同步目录
        sync_directory "$PLUGIN_SOURCE_FULL/scripts" "$TARGET_DEST_DIR/scripts" "scripts"
        sync_directory "$PLUGIN_SOURCE_FULL/tests" "$TARGET_DEST_DIR/tests" "tests"
        sync_directory "$PLUGIN_SOURCE_FULL/config" "$TARGET_DEST_DIR/config" "config"
        sync_directory "$PLUGIN_SOURCE_FULL/hooks" "$TARGET_DEST_DIR/hooks" "hooks"
        
        echo "   ✅ 部署完成 ($NAME v$VERSION)"
    else
        if [ -d "$PLUGIN_DEST_BASE" ]; then
            INSTALLED_VERSIONS=$(ls "$PLUGIN_DEST_BASE")
            echo "   ❌ 版本不一致！"
            echo "      开发版本: $VERSION"
            echo "      安装版本: $INSTALLED_VERSIONS"
        else
            echo "   ⚠️  插件未安装"
        fi
    fi
    echo
done

echo "所有操作已完成。"
