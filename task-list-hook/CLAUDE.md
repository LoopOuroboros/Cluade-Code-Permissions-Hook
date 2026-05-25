[根目录](../CLAUDE.md) > **task-list-hook**

# Task List Hook 模块

> 🏠 [返回项目根目录](../CLAUDE.md)

## 模块概述

任务清单管理规则提醒插件，利用 `TaskCreated`、`TaskCompleted`、`Stop` 专用事件在关键操作点注入运行时提醒。与 `constitution.md` 中的静态 Rule 互补——Rule 提供声明式约束，本插件提供运行时触发点。

## 架构设计

| Hook 事件 | 类型 | 返回值 | 目的 |
|-----------|------|-------|------|
| `SessionStart` | `command` | stdout 纯文本 | 会话开始时注入完整 6 条规则 |
| `TaskCreated` | `prompt` | `{}` (空 JSON，不阻塞) | 提醒 InProgress ≤ 3 + TaskUpdate/TaskList 管理 |
| `TaskCompleted` | `prompt` | `{}` (空 JSON，不阻塞) | 提醒 TaskList 核查 + TaskUpdate 清理 |
| `Stop` | `command` | stdout `{}` + stderr 提醒 | 确定性放行 + 清理提醒展示给用户 |

## TaskList 工具状态变更覆盖

每个 Hook 均覆盖了 TaskList 工具的完整生命周期提醒：

| Hook | TaskUpdate 状态跟踪 | TaskList 核查 | TaskUpdate 清理删除 |
|------|:--:|:--:|:--:|
| `SessionStart` (规则 3-6) | ✅ | ✅ | ✅ |
| `TaskCreated` | ✅ | ✅ | ✅ |
| `TaskCompleted` | ✅ | ✅ | ✅ |
| `Stop` | ✅ | ✅ | ✅ |

## 设计原则

- **SessionStart / Stop 用 command**：SessionStart 不支持 prompt 类型；Stop 的 prompt 类型经实测反复出现 JSON validation failed（LLM 输出非确定性，无法保证纯 JSON），改用 command 脚本确定性输出 `{}`
- **TaskCreated/TaskCompleted 用 prompt**：专用事件，prompt 被设计为条件评估，但所有 prompt 均指明 "do NOT block"，统一返回 `{}`（空 JSON，不含阻塞字段）。注：这两个同样存在 LLM 输出不可靠的隐患，后续如有报错可同样改为 command
- **低噪音**：只用专用事件，不拦截通用 PreToolUse/PostToolUse
- **零外部依赖**：仅 session-start.js / stop-cleanup.js 使用 Node.js 内置模块

## 关键文件

### 🎣 `hooks/hooks.json`
**钩子配置** - 4 个 Hook 事件注册（SessionStart, TaskCreated, TaskCompleted, Stop）

### 📜 `scripts/session-start.js`
**SessionStart 脚本** - 输出任务清单规则文本到 stdout，由 Claude Code 自动注入上下文

### 📜 `scripts/stop-cleanup.js`
**Stop 脚本** - 确定性输出 `{}` 到 stdout（放行停止），清理提醒输出到 stderr（展示给用户）

### 📋 `.claude-plugin/plugin.json`
**插件元数据** - 名称、版本、描述

## 版本信息

- **当前版本**: 1.0.1
- **兼容性**: Claude Code 所有支持 TaskCreated/TaskCompleted 事件的版本
- **最后更新**: 2026-05-20
