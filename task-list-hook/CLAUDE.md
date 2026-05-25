[根目录](../CLAUDE.md) > **task-list-hook**

# Task List Hook 模块

> 🏠 [返回项目根目录](../CLAUDE.md)

## 模块概述

任务清单管理规则提醒插件，利用 `TaskCreated`、`TaskCompleted`、`Stop` 专用事件在关键操作点注入运行时提醒。与 `constitution.md` 中的静态 Rule 互补——Rule 提供声明式约束，本插件提供运行时触发点。

## 架构设计

| Hook 事件 | 类型 | 返回值格式 | 目的 |
|-----------|------|-----------|------|
| `SessionStart` | `command` | stdout 纯文本 | 会话开始时注入完整 6 条规则 |
| `TaskCreated` | `prompt` | `{}` (空 JSON，不阻塞) | 提醒 InProgress ≤ 3 + TaskUpdate/TaskList 管理 |
| `TaskCompleted` | `prompt` | `{}` (空 JSON，不阻塞) | 提醒 TaskList 核查 + TaskUpdate 清理 |
| `Stop` | `prompt` | `{}` (空 JSON，不阻塞) | 提醒 TaskList 审查 + TaskUpdate 标记 + 清理删除 |

## TaskList 工具状态变更覆盖

每个 Hook 均覆盖了 TaskList 工具的完整生命周期提醒：

| Hook | TaskUpdate 状态跟踪 | TaskList 核查 | TaskUpdate 清理删除 |
|------|:--:|:--:|:--:|
| `SessionStart` (规则 3-6) | ✅ | ✅ | ✅ |
| `TaskCreated` | ✅ | ✅ | ✅ |
| `TaskCompleted` | ✅ | ✅ | ✅ |
| `Stop` | ✅ | ✅ | ✅ |

## 设计原则

- **SessionStart 用 command**：文档明确 SessionStart 不支持 type: "prompt"，用 Node.js 脚本的 stdout 注入规则
- **TaskCreated/TaskCompleted/Stop 用 prompt**：专用事件，prompt 被设计为条件评估，但所有 prompt 均指明 "do NOT block"，统一返回 `{}`（空 JSON，不含阻塞字段）
- **返回值统一**：三个 prompt 型 Hook 均返回 `{}`，不使用无效字段（`decision` 对 TaskCreated/TaskCompleted 无效，`ok` 对 Stop 无效）
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
