[根目录](../CLAUDE.md) > **task-list-hook**

# Task List Hook 模块

> 🏠 [返回项目根目录](../CLAUDE.md)

## 模块概述

任务清单管理规则提醒插件，利用 `TaskCreated`、`TaskCompleted`、`Stop` 专用事件在关键操作点注入运行时提醒。与 `constitution.md` 中的静态 Rule 互补——Rule 提供声明式约束，本插件提供运行时触发点。

## 架构设计

| Hook 事件 | 类型 | 返回值 | 目的 |
|-----------|------|-------|------|
| `SessionStart` | `command` | stdout 纯文本 | 会话开始时注入完整 6 条规则 |
| `TaskCreated` | `command` | stdout `{"ok": true}` + stderr 提醒 | 确定性放行 + 提醒 InProgress ≤ 3 |
| `TaskCompleted` | `command` | stdout `{"ok": true}` + stderr 提醒 | 确定性放行 + 提醒 TaskList 核查清理 |
| `Stop` | `command` | stdout `{}` + stderr 提醒 | 确定性放行 + 清理提醒展示给用户 |

## 设计原则

- **全部使用 command 类型**：prompt 型钩子依赖 LLM 输出纯 JSON 不可靠（实测 Stop 反复 JSON validation failed，TaskCreated 字段格式冲突），改为 Node.js 脚本确定性输出，彻底消除非确定性风险
- **低噪音**：只用专用事件，不拦截通用 PreToolUse/PostToolUse
- **零外部依赖**：所有脚本仅使用 Node.js 内置模块

## 关键文件

### 🎣 `hooks/hooks.json`
**钩子配置** - 4 个 Hook 事件注册（SessionStart, TaskCreated, TaskCompleted, Stop）

### 📜 `scripts/session-start.js`
**SessionStart 脚本** - 输出任务清单规则文本到 stdout，由 Claude Code 自动注入上下文

### 📜 `scripts/stop-cleanup.js`
**Stop 脚本** - 确定性输出 `{}` 到 stdout（放行停止），清理提醒输出到 stderr

### 📜 `scripts/task-created.js`
**TaskCreated 脚本** - 确定性输出 `{"ok": true}` 到 stdout（放行创建），InProgress 限制提醒到 stderr

### 📜 `scripts/task-completed.js`
**TaskCompleted 脚本** - 确定性输出 `{"ok": true}` 到 stdout（放行完成），核查清理提醒到 stderr

### 📋 `.claude-plugin/plugin.json`
**插件元数据** - 名称、版本、描述

## 版本信息

- **当前版本**: 1.0.1
- **兼容性**: Claude Code 所有支持 TaskCreated/TaskCompleted 事件的版本
- **最后更新**: 2026-05-20
