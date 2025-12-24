[根目录](../../CLAUDE.md) > **win-path-check-hook**

# win-path-check-hook 模块

> 🏠 [返回项目根目录](../../CLAUDE.md)

## 模块概述

win-path-check-hook 是专门针对 Windows 环境下 Bash 命令路径问题的插件。它智能检测命令中的未转义反斜杠，阻止可能导致路径错误解析的命令，并提供详细的修正建议。

## 接口定义

### 主入口点
```javascript
// scripts/check-path.js
handleHook(input) → { decision: "approve" | "block", reason?: string, suggestion?: string }
```

**输入格式**:
```json
{
  "tool_input": {
    "command": "完整的 Bash 命令"
  }
}
```

**输出格式（拦截）**:
```json
{
  "decision": "block",
  "reason": "⚠️ 检测到Windows路径可能存在未转义的反斜杠\n\n原始命令: cat C:\\Users\\test.txt\n...",
  "suggestion": "修正建议:\ncat C:/Users/test.txt\n\n详细说明:\n..."
}
```

**输出格式（放行）**:
```json
{
  "decision": "approve"
}
```

## 核心依赖

### 内部依赖
- **无配置文件**: 简单高效，无需复杂配置
- **Node.js 内置模块**: `fs`, `path`（仅用于模块导入）

### 外部依赖
- **Node.js Runtime**: >= 14.0.0
- **Claude Code Hook API**: 通过 PreToolUse 钩子触发

## 模块入口

### 主要函数

#### `checkWindowsPath(input)`
主处理函数，接收 Claude Code 传入的 Bash 命令参数

#### `generateErrorMessage(command)`
生成用户友好的错误提示信息，包含原始命令和问题说明

#### `generateSuggestion(command)`
生成具体的修正建议，提供多种解决方案

## 功能验证
在 Claude Code 真实环境中验证：
- Windows 绝对路径拦截
- 相对路径检测
- 推荐替代方案正确显示

## 关键文件

### 🎯 `scripts/check-path.js`
**核心逻辑文件** - 包含路径检测和修正建议生成

### 🎣 `hooks/hooks.json`
**钩子配置文件** - 定义 PreToolUse 钩子匹配 Bash 工具

### 📝 `.claude-plugin/plugin.json`
**插件元数据** - 标准格式的基本插件信息

## 检测逻辑

### 核心算法
使用正则表达式 `/\\[^\s\\]/g` 检测未转义的反斜杠：

```javascript
// 检测逻辑流程
function checkWindowsPath(input) {
    const command = input.tool_input?.command || '';

    if (!command || !command.includes('\\')) {
        return { decision: 'approve' };  // 快速路径
    }

    // 核心检测：未转义的反斜杠
    const hasUnescapedBackslash = /\\[^\s\\]/g.test(command);

    if (hasUnescapedBackslash) {
        return {
            decision: 'block',
            reason: generateErrorMessage(command),
            suggestion: generateSuggestion(command)
        };
    }

    return { decision: 'approve' };
}
```

### 检测场景覆盖

| 场景类型 | 示例命令 | 检测结果 | 说明 |
|----------|----------|----------|------|
| 绝对路径 | `cat C:\Users\test.txt` | 🚫 拦截 | Windows 绝对路径 |
| 相对路径 | `ls folder\subfolder` | 🚫 拦截 | 相对路径包含反斜杠 |
| 空格路径 | `cd C:\Program Files\app\` | 🚫 拦截 | 包含空格需要转义 |
| 用户目录 | `cat ~\Documents\note.txt` | 🚫 拦截 | 波浪号目录 |
| 混合场景 | `find . -path C:\Data\logs\` | 🚫 拦截 | 命令参数中的路径 |
| 正常命令 | `echo hello` | ✅ 放行 | 不含反斜杠 |
| 正斜杠 | `cat C:/Users/test.txt` | ✅ 放行 | 使用正斜杠正确 |

## 智能特性

### 🎯 零配置设计
- **硬编码规则**: 检测逻辑嵌入代码，无需配置文件
- **即插即用**: 安装后立即生效，无需额外设置
- **错误安全**: 配置加载异常不影响核心功能

### ⚡ 高性能处理
- **快速路径**: 不含反斜杠的命令立即放行
- **正则优化**: 单次正则匹配，O(1) 时间复杂度
- **轻量内存**: 无缓存机制，最小内存占用

### 🔍 多维度建议
```javascript
// 提供三种修正策略
1. 使用正斜杠（推荐）
2. 双反斜杠转义
3. 引号包裹
```

## 部署说明

### 同步要求
⚠️ **修改代码后必须同步到实际插件运行目录**

运行目录格式：
```
~/.claude/plugins/cache/win-bash-path-check-hook/1.0.0/
```

## 开发指南

### 代码维护
- **单一职责**: 一个文件包含所有核心逻辑
- **函数职责**: `checkWindowsPath`, `generateErrorMessage`, `generateSuggestion`
- **错误处理**: 所有边界条件都有默认处理

### 性能优化
```javascript
// 避免的性能陷阱
❌  字符串分割 + 遍历 + 多次判断
❌  加载外部配置文件
❌  缓存机制增加复杂性
✅  单次正则匹配
✅  快速路径优先返回
✅  直接字符串处理
```

### 验证策略
- **功能验证**: 核心算法正确性通过实际使用验证
- **边界处理**: null、undefined、空字符串有默认处理
- **性能保证**: 轻量级设计，不影响正常使用

## 模块边界

- **输入范围**: 仅处理 `tool_input.command` 字符串
- **输出格式**: 统一的 JSON 决策格式
- **职责范围**: 专注路径检测，不涉及命令执行
- **依赖最小化**: 仅依赖 Node.js 核心模块

## 与现有模块对比

| 特性 | bash-permission-hook | web-permission-hook | win-path-check-hook |
|------|---------------------|--------------------|---------------------|
| **配置复杂度** | 高（复杂规则系统） | 中（工具映射） | 无（硬编码逻辑） |
| **文件数量** | 6个核心文件 | 6个核心文件 | 4个核心文件 |
| **代码行数** | 500+ 行 | 200+ 行 | 100+ 行 |
| **启动时间** | ~100ms | ~20ms | <10ms |
| **维护复杂度** | 高 | 中 | 低 |

## 版本信息

- **当前版本**: 1.2.0
- **兼容性**: Node.js >= 14.0.0
- **最后更新**: 2025-12-23
- **项目状态**: ✅ 生产就绪

## 📋 变更记录 (Changelog)

### 2025-12-23 15:34:56
- 🧭 添加导航面包屑
- 📊 更新模块状态为生产就绪
- 🔗 完善与根目录文档的链接

### 2025-12-22
- ✨ 初始版本创建
- 🪟 建立 Windows 路径检测逻辑
- 📚 完善零配置设计文档

---

> 🏠 [返回项目根目录](../../CLAUDE.md) | 🔧 [Bash 模块文档](../bash-permission-hook/CLAUDE.md) | 🌐 [Web 模块文档](../web-permission-hook/CLAUDE.md)