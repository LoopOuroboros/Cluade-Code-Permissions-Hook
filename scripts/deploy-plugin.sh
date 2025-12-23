#!/bin/bash
# Claude Code 插件批量部署脚本 (Linux/macOS)

# 设置输出颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

echo "================================"
echo "Claude Code 插件批量部署脚本 (Bash)"
echo "================================"
echo

# 确定项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MARKETPLACE_JSON="$PROJECT_ROOT/.claude-plugin/marketplace.json"

# 检查 marketplace.json
if [ ! -f "$MARKETPLACE_JSON" ]; then
    echo -e "${RED}❌ 错误：未找到 marketplace.json 文件！${NC}"
    echo "  预期路径: $MARKETPLACE_JSON"
    exit 1
fi

echo "正在读取配置: $MARKETPLACE_JSON"

# 使用 Node.js 解析 JSON (环境需安装 Node.js)
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 错误：未找到 node 命令。请先安装 Node.js。${NC}"
    exit 1
fi

# 解析 Marketplace Name
# 注意：在 Windows Git Bash 中，路径格式可能需要转换，或者直接使用相对路径
# 使用相对路径 require 避免盘符问题
MARKETPLACE_NAME=$(cd "$PROJECT_ROOT" && node -e "try { const data = require('./.claude-plugin/marketplace.json'); console.log(data.name || ''); } catch(e) { process.exit(1); }")
if [ $? -ne 0 ] || [ -z "$MARKETPLACE_NAME" ]; then
    echo -e "${RED}❌ 错误：解析 marketplace.json 失败或缺少 'name' 字段！${NC}"
    exit 1
fi

# 转小写
MARKETPLACE_NAME=$(echo "$MARKETPLACE_NAME" | tr '[:upper:]' '[:lower:]')

echo "市场名称: $MARKETPLACE_NAME"

# 获取插件数量
PLUGIN_COUNT=$(cd "$PROJECT_ROOT" && node -e "const data = require('./.claude-plugin/marketplace.json'); console.log(data.plugins ? data.plugins.length : 0);")
echo "找到 $PLUGIN_COUNT 个插件待处理..."
echo

# 部署单个插件的函数
deploy_plugin() {
    local plugin_name="$1"
    local plugin_source="$2"
    local plugin_version="$3"
    local marketplace_name="$4"

    echo "--------------------------------------------------"
    echo "正在处理插件: $plugin_name"

    # 处理 source 路径 (如果是相对路径 ./ 或 .\ 开头)
    if [[ "$plugin_source" == ./* ]]; then
        plugin_source="${plugin_source:2}"
    elif [[ "$plugin_source" == .\\* ]]; then
        plugin_source="${plugin_source:2}"
    fi
    local full_source_path="$PROJECT_ROOT/$plugin_source"

    # 检查源码目录
    if [ ! -d "$full_source_path" ]; then
        echo -e "${RED}❌ 错误：插件源码目录不存在！${NC}"
        echo "  $full_source_path"
        return
    fi

    # 验证版本一致性
    local marketplace_version="$plugin_version"
    local source_version=""
    
    if [ -f "$full_source_path/.claude-plugin/plugin.json" ]; then
        source_version=$(cd "$full_source_path" && node -e "try { console.log(require('./.claude-plugin/plugin.json').version || ''); } catch(e) {}")
    else
        echo -e "${YELLOW}⚠️ 警告：无法解析 plugin.json 读取版本号${NC}"
    fi

    if [ -n "$source_version" ] && [ "$source_version" != "$marketplace_version" ]; then
        echo -e "${RED}❌ 错误：版本号不一致！${NC}"
        echo "  marketplace.json 定义版本: $marketplace_version"
        echo "  plugin.json 实际版本:      $source_version"
        echo "  请修正版本号一致性后再试。"
        return
    fi

    if [ -z "$source_version" ]; then
        echo -e "${YELLOW}⚠️ 警告：无法验证 plugin.json 版本号，将使用 marketplace.json 版本: $marketplace_version${NC}"
    fi

    local dev_version="$marketplace_version"

    # 设置目标路径
    local user_home="$HOME"
    local marketplace_dir="$user_home/.claude/plugins/cache/$marketplace_name"
    local plugin_base_dir="$marketplace_dir/$plugin_name"
    local plugin_dest="$plugin_base_dir/$dev_version"

    echo "  开发版本：$dev_version"
    echo "  目标路径：$plugin_dest"

    # 检查目标目录是否存在
    if [ ! -d "$plugin_dest" ]; then
        echo -e "${RED}❌ 错误：目标插件目录不存在！${NC}"
        
        if [ -d "$plugin_base_dir" ]; then
            # 列出已安装版本
            local installed_versions=$(ls -1 "$plugin_base_dir" 2>/dev/null | tr '\n' ', ')
            if [ -n "$installed_versions" ]; then
                echo -e "${RED}❌ 插件 $plugin_name 版本号不一致${NC}"
                echo "   开发版本 = $dev_version"
                echo "   实际安装版本 = ${installed_versions%, }"
            else
                echo -e "${RED}❌ 插件 $plugin_name 已安装但无版本目录 (空目录)${NC}"
            fi
        else
            echo -e "${RED}❌ 插件 $plugin_name 未安装 (基础目录不存在)${NC}"
        fi
        return
    fi

    echo -e "${GREEN}✓ 目标目录存在，开始同步...${NC}"

    # 同步函数
    sync_dir() {
        local dir_name="$1"
        local src="$full_source_path/$dir_name"
        local dest="$plugin_dest/$dir_name"

        if [ ! -d "$src" ]; then
            # echo -e "    ${GRAY}○ $dir_name 目录不存在，跳过${NC}"
            return
        fi

        # 确保目标目录存在
        if [ ! -d "$dest" ]; then
             mkdir -p "$dest"
        fi

        # 使用 cp -rf 同步 (覆盖)
        cp -rf "$src/"* "$dest/" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo -e "    ${GREEN}✓ $dir_name 同步成功${NC}"
        else
            echo -e "    ${YELLOW}⚠ $dir_name 同步有问题${NC}"
        fi
    }

    # 同步目录列表
    for dir in "scripts" "tests" "config" "hooks" ".claude-plugin"; do
        sync_dir "$dir"
    done

    # 同步 CLAUDE.md
    if [ -f "$full_source_path/CLAUDE.md" ]; then
        cp -f "$full_source_path/CLAUDE.md" "$plugin_dest/" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo -e "    ${GREEN}✓ CLAUDE.md 同步成功${NC}"
        else
            echo -e "    ${YELLOW}⚠ CLAUDE.md 同步失败${NC}"
        fi
    fi
}

# 获取插件列表 (格式: name|source|version)
PLUGIN_LIST=$(cd "$PROJECT_ROOT" && node -e "
    try {
        const data = require('./.claude-plugin/marketplace.json');
        if (data.plugins) {
            data.plugins.forEach(p => {
                console.log(\`\${p.name}|\${p.source}|\${p.version}\`);
            });
        }
    } catch(e) {
        process.exit(1);
    }
")

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 错误：解析插件列表失败！${NC}"
    exit 1
fi

# 设置 IFS 为换行符以遍历行
IFS=$'\n'
for line in $PLUGIN_LIST; do
    # 恢复 IFS 进行分割
    IFS='|' read -r p_name p_source p_version <<< "$line"
    # 调用部署函数
    deploy_plugin "$p_name" "$p_source" "$p_version" "$MARKETPLACE_NAME"
done
unset IFS

echo
echo "================================"
echo "所有任务处理完成！"
echo "================================"
echo
