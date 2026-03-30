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

#### `handleHook(input)`
主处理函数，接收 Claude Code 传入的命令参数

#### `loadRules()`
从配置文件加载拦截规则

#### `splitCommandsWithSplits(command)`
扩展的命令拆分函数，支持操作符位置检测

#### `isInPipeReceiver()`
检查命令是否作为管道接收端

#### `checkCommand(cmd, rules, options)`
基于规则检索单个命令是否被拦截

## 关键文件

### 🎯 `scripts/check-command.js`
**核心逻辑文件** - 包含所有命令处理逻辑

### ⚙️ `config/config.json`
**配置文件** - 定义拦截规则和提示信息

### 🎣 `hooks/hooks.json`
**钩子配置** - Claude Code 钩子注册信息

## 配置说明

### 规则结构
```json
{
  "pattern": "grep",
  "action": "reject",
  "suggestion": "使用内置的Grep工具代替",
  "allowInPipeReceiver": true
}
```

**新增字段说明**：
- **`allowInPipeReceiver`**: Boolean类型，可选字段。设置为 `true` 时，命令在管道接收端位置将被放行，便于与其他命令配合进行数据处理。

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
- **只读命令自动放行**: `status`, `log`, `diff`, `show`, `branch` (安全参数), `tag` (安全参数) 等
- **操作类命令用户确认**: `commit`, `push`, `pull`, `merge`, `rebase`, `checkout`, `reset`, `clean` 等
- **智能参数分析**: 区分 `git branch` (只读) 和 `git branch -D` (操作类)
- **向后兼容**: 保留现有 config.json 中的 Git 规则作为后备

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
1. 在 `config/config.json` 中添加规则配置
2. 在 Claude Code 环境中验证特殊场景（如管道位置）
3. 更新部署文档（如需要）

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

- **当前版本**: 2.0.0
- **兼容性**: Node.js >= 14.0.0
- **最后更新**: 2025-12-23

## 📋 变更记录 (Changelog)

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
- 📊 版本升级至 2.0.0

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