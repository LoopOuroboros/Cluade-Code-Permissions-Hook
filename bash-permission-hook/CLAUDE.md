[根目录](../../CLAUDE.md) > **bash-permission-hook**

# Bash Permission Hook 模块

> 🏠 [返回项目根目录](../../CLAUDE.md)

## 模块概述

Bash Permission Hook 是 Claude Code 权限钩子插件的核心实现模块，负责拦截危险的 Bash 命令并推荐使用内置工具。

## 接口定义

### 主入口点
```javascript
// scripts/check-command.js
handleHook(input) → { decision: "approve" | "block", reason?: string }
```

**输入格式**:
```json
{
  "tool_input": {
    "command": "完整的 Bash 命令"
  }
}
```

**输出格式**:
```json
{
  "decision": "block",
  "reason": "⚠️ grep命令被拦截，使用内置的Grep工具代替"
}
```

## 核心依赖

### 内部依赖
- **配置系统**: `config/config.json` - 拦截规则定义
- **Node.js 内置模块**: `fs`, `path`

### 外部依赖
- **Node.js Runtime**: >= 14.0.0
- **Claude Code Hook API**: 通过标准输入传递参数

## 模块入口

### 主要函数

#### `handleHook(input)` — `check-command.js`
主处理函数，接收 Claude Code 传入的命令参数

#### `makeDecision(command)` — `decision-maker.js`
决策入口，遍历命令上下文并调用 `evaluateCommand()`

#### `evaluateCommand(context, rules)` — `decision-maker.js`
三级配置匹配：specialCommands → gitClassification → rules 数组

#### `loadConfig()` — `rule-engine.js`
加载完整配置对象（含所有配置段），带缓存

#### `loadRules()` — `rule-engine.js`
返回 `config.rules` 数组，向后兼容

#### `loadWrapperConfig()` — `rule-engine.js`
返回 `config.wrapperCommands` 配置

#### `matchRule(commandName, args, context, rules)` — `rule-engine.js`
基于 rules 数组匹配单条规则

#### `matchSpecialCommand(commandName, args, context)` — `rule-engine.js`
基于 `specialCommands` 配置段处理 echo/cat/head/tail 等命令

#### `handleGitCommand(context)` — `rule-engine.js`
基于 `gitClassification` 配置段处理所有 git 子命令

## 关键文件

### 🎯 `scripts/check-command.js`
**核心逻辑文件** - 包含所有命令处理逻辑

### ⚙️ `config/config.json`
**配置文件** - 定义拦截规则和提示信息

### 🎣 `hooks/hooks.json`
**钩子配置** - Claude Code 钩子注册信息

## 配置说明

### 配置结构概览

`config.json` 包含 5 个配置段，全部命令拦截逻辑由配置驱动：

```json
{
  "skipWrapperCheck": { ... },     // 包装命令跳过检测
  "gitClassification": { ... },    // Git 命令分类
  "specialCommands": { ... },      // 特殊命令处理 (echo/cat/head/tail)
  "wrapperCommands": { ... },      // 包装命令提取配置
  "rules": [ ... ]                 // 通用规则数组
}
```

### 1. `skipWrapperCheck` — 包装命令跳过检测

```json
{
  "enabled": true,
  "prefixes": ["wsl "]
}
```

命令以 `prefixes` 中任意前缀开头时，跳过所有规则检查直接放行。

### 2. `gitClassification` — Git 命令分类

```json
{
  "actionCommands": {
    "decision": "ask",
    "message": "...",
    "commands": ["commit", "push", ...]
  },
  "conditionalCommands": {
    "branch": {
      "defaultDecision": "allow",
      "dangerousFlags": ["-d", "-D", ...],
      "decision": "ask",
      "message": "..."
    }
  },
  "readonlyCommands": ["status", "log", ...]
}
```

- `actionCommands`: 需要确认的 Git 操作类命令
- `conditionalCommands`: 根据参数决定是否拦截（支持 `dangerousFlags`、`dangerousSubcommands`、`readonlySubcommands`）
- `readonlyCommands`: 始终放行的只读命令

### 3. `specialCommands` — 特殊命令处理

```json
{
  "echo": {
    "decision": "deny",
    "conditions": { "denyFileOutput": true },
    "message": "..."
  },
  "cat": {
    "decision": "deny",
    "allowInPipeSender": true,
    "allowInPipeReceiver": true,
    "message": "..."
  }
}
```

支持条件：`denyFileOutput`、`allowNullRedirect`、`allowFollow`、`maxLines`
支持管道放行：`allowInPipeSender`、`allowInPipeReceiver`

### 4. `wrapperCommands` — 包装命令提取

```json
{
  "wsl": {
    "triggers": ["wsl"],
    "commandFlags": ["-c", "--command"],
    "extractFromLastArg": true
  }
}
```

定义如何从包装命令中提取内部命令进行递归检查。

### 5. `rules` — 通用规则数组

```json
{
  "pattern": "grep",
  "decision": "deny",
  "suggestion": "使用内置的Grep工具代替",
  "allowInPipeReceiver": true,
  "allowInWsl": true
}
```

**支持字段**：
- **`allowInPipeReceiver`**: 命令在管道接收端位置放行
- **`allowInPipeSender`**: 命令在管道发送端位置放行
- **`allowInWsl`**: 命令在WSL环境下放行
- **`allowInConditional`**: 命令在 `&&`/`||` 后放行

### 支持的命令类型
- **单命令**: `grep`, `find`, `cat`
- **多词命令**: `npm install`, `git push`
- **路径前缀**: 自动剥离 `/usr/bin/grep` → `grep`

## 智能特性

### 📍 管道位置检测
- **识别逻辑**: 基于操作符位置和命令索引
- **配置化处理**: 支持 `allowInPipeReceiver` 配置字段，可配置命令在管道接收端位置时放行
- **当前实现**: `grep` 和 `head` 命令在管道接收端位置自动放行
- **安全保证**: 其他位置仍严格执行拦截

### 📦 包装命令支持
- **支持场景**: WSL、Docker、SSH 等包装命令中的内部命令检测
- **识别模式**: 自动检测 `wsl -c "command"`, `docker exec -c "command"`, `ssh host "command"` 等模式
- **递归检查**: 对包装命令中的内部命令进行完整的拦截检查
- **完整覆盖**: 内部命令同样享受管道位置检测和规则匹配功能

### 🔧 可扩展架构
- **规则驱动**: 新增命令无需修改核心代码
- **错误容错**: 配置加载失败时默认放行
- **性能优化**: 命令拆分结果缓存

### 🎯 Git 命令智能分类
- **完全配置驱动**: 所有 Git 命令分类由 `config.json` → `gitClassification` 段定义
- **只读命令自动放行**: `readonlyCommands` 数组中定义的命令直接放行
- **操作类命令用户确认**: `actionCommands.commands` 中定义的命令需要确认
- **条件命令参数分析**: `conditionalCommands` 支持 dangerousFlags/dangerousSubcommands/readonlySubcommands 精细控制
- **零代码扩展**: 新增 Git 子命令只需修改配置

## 部署注意

### 同步要求
⚠️ **修改代码后必须同步到实际插件运行目录**

运行目录格式：
```
~/.claude/plugins/cache/claude-code-permissions-hook/bash-permission-hook/1.1.0/
```

### 手动测试
测试典型场景，在 Claude Code 真实环境中验证：
- `grep` 命令拦截功能
- `head` 命令在管道中的表现
- 推荐替代方案提示信息是否准确

### 部署脚本位置
- **功能**：自动读取版本号、同步文件

## 开发指南

### 添加新拦截规则

**通用命令**: 在 `config.json` → `rules` 数组中添加规则配置
**特殊命令** (如 echo/cat 类): 在 `config.json` → `specialCommands` 中添加
**Git 子命令**: 在 `config.json` → `gitClassification` 中添加
**包装命令**: 在 `config.json` → `wrapperCommands` 中添加

无需修改任何核心代码。

### 调试技巧
```javascript
// 启用详细日志
console.log('命令拆分结果:', splitCommands, splits);
console.log('管道位置检测:', isPipeReceiver);
```

## 模块边界

- **输入**: 仅处理标准 JSON 格式的命令输入
- **输出**: 统一的决策响应格式
- **职责**: 专注命令拦截，不涉及实际执行
- **依赖**: 最小化外部依赖，确保轻量级运行

## 版本信息

- **当前版本**: 2.1.0
- **兼容性**: Node.js >= 14.0.0
- **最后更新**: 2026-05-06

## 📋 变更记录 (Changelog)

### 2026-05-06
- 🏗️ **架构重构**: 消除全部硬编码命令逻辑，实现完全配置驱动
- ⚙️ config.json 新增 `skipWrapperCheck`、`gitClassification`、`specialCommands`、`wrapperCommands` 四个配置段
- 🔧 rule-engine.js 新增 `loadConfig()`、`loadWrapperConfig()`、`matchSpecialCommand()`、`handleGitCommand()`
- 🔧 decision-maker.js 删除全部硬编码 handler (handleEcho/handleHeadTail/handleCat/handleGitCommand/isGitReadonlyCommand/extractLineCount)
- 🔧 context-analyzer.js 删除硬编码 WRAPPER_COMMANDS，改为从 config.json 动态加载
- 🔧 check-command.js WSL 跳过逻辑改为配置驱动
- 🗑️ config.json 删除 7 条失效的 git 规则（已由 gitClassification 管理）
- 📊 版本升级至 3.0.0

### 2026-04-24
- 🎯 新增 `allowInWsl` 配置字段，支持在WSL环境下放行指定命令
- 🔧 context-analyzer.js 新增 `fromWsl` 上下文标记，识别WSL包装命令链
- 🔧 decision-maker.js 新增WSL上下文感知，规则匹配时判断 `allowInWsl`
- ⚙️ config.json 追加 find/grep/awk 的 `allowInWsl: true`，允许WSL内执行

### 2026-03-30
- 🎯 新增 Git 命令智能分类拦截机制
- 🔧 实现 Git 只读命令自动放行（status, log, diff, show 等）
- 🔧 实现 Git 操作类命令用户确认（commit, push, pull, merge 等）
- 🔧 智能参数分析，区分 branch/tag/config/remote/stash 的安全与危险操作
- 🏗️ 在 decision-maker.js 中添加 handleGitCommand 和 isGitReadonlyCommand 函数
- 📦 向后兼容，保留现有 config.json 中的 Git 规则作为后备

### 2026-03-30
- 🎯 新增包装命令递归检测（wsl/docker/ssh/bash -c/sh -c）
- 🔧 增强 context-analyzer.js 支持内部命令提取和递归分析
- 📦 WRAPPER_COMMANDS 配置系统，支持多种包装命令模式
- 🔍 完整覆盖包装命令中的内部命令拦截检查

### 2026-03-30
- 🚀 完全重写为 v2.0 架构
- 🎯 新增模块化解析器架构（词法分析、语法解析、上下文分析）
- ✨ 实现智能 Echo 命令处理（仅拦截文件写入场景）
- ✨ 实现 Head/Tail 智能策略（小范围读取、-f 监控、管道放行）
- ✨ 实现 Cat 管道发送端放行
- 🏗️ 新增规则引擎和决策制定器
- 📊 版本升级至 2.1.0

### 2025-12-23 15:34:56
- 🧭 添加导航面包屑
- 📊 更新模块状态为生产就绪
- 🔗 完善与根目录文档的链接

### 2025-12-19
- ✨ 初始版本创建
- 🏗️ 建立核心拦截逻辑
- 📚 完善文档体系

---

> 🏠 [返回项目根目录](../../CLAUDE.md) | 📄 [Web 模块文档](../web-permission-hook/CLAUDE.md) | 🪟 [Win Path 模块文档](../win-path-check-hook/CLAUDE.md)