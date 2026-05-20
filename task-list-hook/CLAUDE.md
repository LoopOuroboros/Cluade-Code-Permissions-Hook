[根目录](../CLAUDE.md) > **task-list-hook**

# Task List Hook 模块

> 🏠 [返回项目根目录](../CLAUDE.md)

## 模块概述

任务清单管理规则提醒插件，利用 `TaskCreated`、`TaskCompleted`、`Stop` 专用事件在关键操作点注入运行时提醒。与 `constitution.md` 中的静态 Rule 互补——Rule 提供声明式约束，本插件提供运行时触发点。

## 架构设计

| Hook 事件 | 类型 | 目的 |
|-----------|------|------|
| `SessionStart` | `command` | 会话开始时通过 stdout 注入完整 6 条规则 |
| `TaskCreated` | `prompt` | 创建任务后提醒 InProgress ≤ 3 |
| `TaskCompleted` | `prompt` | 完成任务后提醒核查+清理流程 |
| `Stop` | `prompt` | 会话停止前提醒任务清理 |

## 设计原则

- **SessionStart 用 command**：文档明确 SessionStart 不支持 type: "prompt"，用 Node.js 脚本的 stdout 注入规则
- **TaskCreated/TaskCompleted 用 prompt**：专用事件，prompt 被设计为条件评估，但所有 prompt 均指明 "do NOT block"
- **低噪音**：只用专用事件，不拦截通用 PreToolUse/PostToolUse
- **零外部依赖**：仅 session-start.js 使用 Node.js 内置模块

## 关键文件

### 🎣 `hooks/hooks.json`
**钩子配置** - 4 个 Hook 事件注册（SessionStart, TaskCreated, TaskCompleted, Stop）

### 📜 `scripts/session-start.js`
**SessionStart 脚本** - 输出任务清单规则文本到 stdout，由 Claude Code 自动注入上下文

### 📋 `.claude-plugin/plugin.json`
**插件元数据** - 名称、版本、描述

## 版本信息

- **当前版本**: 1.0.0
- **兼容性**: Claude Code 所有支持 TaskCreated/TaskCompleted 事件的版本
- **最后更新**: 2026-05-20
