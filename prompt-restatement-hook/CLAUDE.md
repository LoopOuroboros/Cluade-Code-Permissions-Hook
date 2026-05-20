[根目录](../CLAUDE.md) > **prompt-restatement-hook**

# Prompt Restatement Hook 模块

## 模块概述

用户意图确认插件，在每次用户提交提示词时注入复述确认指令。要求 LLM 在执行用户请求前先用自己的话复述请求内容，并通过 `AskUserQuestion` 工具与用户确认理解正确后才继续执行。

## 架构设计

| Hook 事件 | 类型 | 目的 |
|-----------|------|------|
| `UserPromptSubmit` | `command` | 注入复述确认指令到 LLM 上下文 |

## 处理流程

```text
用户提交提示词 → UserPromptSubmit 事件触发
    → check-prompt.js 读取 stdin（含用户 prompt）
    → 构建复述确认指令文本
    → 通过 additionalContext 注入到 LLM 上下文
    → LLM 按指令：复述 → AskUserQuestion 确认 → 等待确认 → 执行
```

## 设计原则

- **command 类型**：UserPromptSubmit 支持 command 和 prompt 两种类型。prompt 仅能做 yes/no 条件判断，无法注入行为指令；command 可通过 `additionalContext` 注入指令
- **fail-open**：脚本发生任何错误均返回空指令，不阻塞用户请求
- **轻量无依赖**：仅使用 Node.js 内置 `fs` 模块，零外部依赖
- **无 config 目录**：指令文本硬编码在脚本中，无需外部配置

## 关键文件

### scripts/check-prompt.js
**核心逻辑** - 读取 stdin 中的用户 prompt，构建复述确认指令，输出 JSON 到 stdout

### hooks/hooks.json
**钩子配置** - UserPromptSubmit 事件注册

### .claude-plugin/plugin.json
**插件元数据** - 名称、版本、描述

## 指令注入机制

UserPromptSubmit 的 command 类型钩子通过 stdout 返回 JSON：

```json
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "复述确认指令文本..."
  }
}
```

`additionalContext` 中的文本会被预置到 LLM 的上下文中，作为系统级指令生效。

## 版本信息

- **当前版本**: 1.0.0
- **兼容性**: Claude Code 支持 UserPromptSubmit 事件的版本
- **最后更新**: 2026-05-20
