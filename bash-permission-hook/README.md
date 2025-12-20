# Bash Permissions Hook v1.0.0

Claude Code插件，拦截危险的Bash命令并推荐使用Claude Code内置工具。

## 功能概述

- ✅ 拦截危险的Bash命令（find、grep、cat等）
- ✅ 支持复合命令拆分（&&、|、||）
- ✅ 前缀匹配和路径忽略
- ✅ 多词命令匹配（如 `npm install`）
- ✅ 可配置拦截规则
- ✅ 测试验证

## 安装

```bash
# 复制到Claude Code插件目录
cp -r bash-permission-hook/* ~/.claude/plugins/cache/claude-code-permissions-hook/bash-permission-hook/1.0.0/

# 或从源码安装
# 1. 复制整个bash-permission-hook目录到插件缓存位置
# 2. 重启Claude Code
# 3. 在设置中启用 bash-permission-hook 插件
```

## 配置

编辑 `config/config.json` 来自定义拦截规则：

```json
{
  "rules": [
    {
      "pattern": "find",
      "action": "reject",
      "suggestion": "使用内置的Glob工具代替"
    }
  ]
}
```

### 规则格式

- **pattern**: 命令模式，支持多词（如 "npm install"）
- **action**: 操作类型（"reject" 拦截，"allow" 放行）
- **suggestion**: 拦截提示和替代建议

### 支持的命令匹配

- 单词命令：`find` 匹配 `find`、`/usr/bin/find`
- 多词命令：`npm install` 匹配 `npm install`、`npm install -g`（但不匹配 `npm run build`）

## 测试

运行完整测试套件：

```bash
npm test
node tests/test.js
```

### 测试用例

- ✅ 命令拆分测试
- ✅ 前缀匹配测试
- ✅ 复合命令拦截测试
- ✅ 完整流程测试

## 使用示例

### 被拦截的命令

```bash
# find命令被拦截
find . -name "*.js"
# 输出: ⚠️ find命令被拦截，使用内置的Glob工具代替

# 复合命令拆分
cat file.txt | grep test && echo found
# 输出: ⚠️ cat命令被拦截，使用内置的Read工具代替

# npm安装被拦截
npm install express
# 输出: ⚠️ npm命令被拦截，请手动在终端中执行npm install
```

### 允许的命令

```bash
# 正常命令不受影响
echo "hello"
cd /home
npm run build
```

## 技术实现

### 核心算法

1. **命令拆分**: 按操作符（&&、|、||）位置排序切分
2. **命令提取**: 移除路径前缀，支持多词识别
3. **规则匹配**: 前缀匹配的规则
4. **消息生成**: 返回用户友好的提示

### 项目结构

```
bash-permission-hook/
├── .claude-plugin/
│   └── plugin.json              # 插件元数据
├── scripts/
│   └── check-command.js          # 核心Hook逻辑
├── config/
│   └── config.json               # 拦截规则
├── tests/
│   └── test.js                   # 测试套件
├── hooks.json                    # Claude Code Hook配置
├── package.json                  # Node.js配置
└── README.md                     # 本文档
```

### Hook集成

插件使用`PreToolUse` Hook拦截Bash命令：

```json
{
  "description": "Bash command permission hook for Claude Code",
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node ${CLAUDE_PLUGIN_ROOT}/scripts/check-command.js"
          }
        ]
      }
    ]
  }
}
```

## 版本历史

### v1.0.0

- ✅ 初始版本发布
- ✅ 支持命令拆分（&&、|、||）
- ✅ 前缀匹配和路径忽略
- ✅ 多词命令匹配（支持 `npm install` 等）
- ✅ 12条默认拦截规则
- ✅ 完整测试覆盖

## 设计文档

详细的设计与实现文档请参考：
- 项目根目录的 `BASH_PLUGIN_DESIGN.md`

## 许可证

MIT

## 作者

Claude Code Plugin - Bash Permissions Hook