[根目录](../../CLAUDE.md) > **web-permission-hook**

# Web Permission Hook 模块

> 🏠 [返回项目根目录](../../CLAUDE.md)

## 模块概述

Web Permission Hook 是 Claude Code Web 工具权限控制的核心实现模块，负责拦截 WebSearch 工具调用，并引导用户使用更安全的 MCP (Model Context Protocol) 服务。

## 接口定义

### 主入口点
```javascript
// scripts/check-command.js
handleHook(input) → { decision: "approve" | "block", reason?: string }
```

**输入格式**:
```json
{
  "tool_name": "WebSearch",
  "tool_input": {
    // 工具特定参数
  }
}
```

**输出格式**:
```json
{
  "decision": "block",
  "reason": "⚠️ WebSearch 工具被拦截，使用 Search MCP 来代替"
}
```

## 核心依赖

### 内部依赖
- **配置系统**: `config/config.json` - 工具映射规则定义
- **Node.js 内置模块**: `fs`, `path`

### 外部依赖
- **Node.js Runtime**: >= 14.0.0
- **Claude Code Hook API**: 通过标准输入传递参数
- **MCP 服务生态**: Search MCP (推荐替代)

## 模块入口

### 主要函数

#### `handleHook(input)`
主处理函数，接收 Claude Code 传入的工具调用参数

#### `loadToolMappings()`
从配置文件加载工具映射规则

#### `checkToolReplacement(toolName, mappings)`
检查工具是否需要替换，返回决策和建议

## 关键文件

### 🎯 `scripts/check-command.js`
**核心逻辑文件** - 包含所有 Web 工具处理逻辑

### ⚙️ `config/config.json`
**配置文件** - 定义工具映射规则和替代建议

### 🎣 `hooks/hooks.json`
**钩子配置** - Claude Code Web 工具钩子注册

### 🔌 `.claude-plugin/plugin.json`
**插件元数据** - Web 插件注册信息

## 配置说明

### 工具映射结构
```json
{
  "toolMappings": {
    "WebSearch": "使用 Search MCP 来代替"
  }
}
```

### 支持的工具类型
- **WebSearch**: 网络搜索工具 → Search MCP 服务
- **其他工具**: 默认放行，除非在映射中明确定义

## MCP 生态集成

### 推荐的 MCP 服务

#### 🔌 Search MCP
- **功能**: 专业的网络搜索服务
- **优势**: 多搜索引擎集成、结果过滤、语义搜索
- **替代场景**: 所有 WebSearch 使用场景

### 集成优势
- **更安全**: MCP 服务提供更好的安全边界
- **更强大**: 功能比原生工具更丰富
- **可扩展**: 支持插件化和自定义扩展
- **标准化**: 遵循 MCP 标准协议

## 智能特性

### 🎯 精准工具识别
- **名称匹配**: 基于 `tool_name` 字段精确识别
- **类型区分**: 只针对 Web 相关工具进行拦截
- **例外处理**: 非目标工具自动放行

### 🔧 灵活配置系统
- **规则驱动**: 通过 JSON 配置轻松扩展工具映射
- **错误容错**: 配置加载失败时默认放行
- **实时生效**: 配置修改无需重启即可生效

## 部署注意

### 同步要求
⚠️ **修改代码后必须同步到实际插件运行目录**

运行目录格式：
```
~/.claude/plugins/cache/claude-code-permissions-hook/web-permission-hook/2.0.0/
```

### 手动测试
在 Claude Code 真实环境中测试：
- WebSearch 工具拦截功能
- 确认 MCP 替代建议正确显示

## 开发指南

### 添加新工具映射
1. 在 `config/config.json` 中添加新的工具映射
2. 在 Claude Code 环境中验证拦截提示信息的准确性
3. 更新文档（如需要）

### 调试技巧
```javascript
// 启用详细日志
console.log('工具名称:', toolName);
console.log('映射结果:', mappings[toolName]);
console.log('决策输出:', result);
```

## 模块边界

- **输入**: 仅处理 Claude Code 工具调用标准格式
- **输出**: 统一的决策响应格式
- **职责**: 专注 Web 工具拦截，不涉及实际网络请求
- **依赖**: 最小化外部依赖，确保轻量级运行
- **范围**: 不处理 Bash 命令或其他类型工具

## 与 Bash 模块协作

- **职责分离**: Bash 模块处理系统命令，Web 模块处理网络工具
- **配置独立**: 各自维护独立的配置文件和规则
- **部署同步**: 修改后都需要同步到相应运行目录
- **测试隔离**: 各自独立的测试套件和验证流程

## 版本信息

- **当前版本**: 2.0.0
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
- 🌐 建立 Web 工具拦截机制
- 📚 完善 MCP 集成文档

---

> 🏠 [返回项目根目录](../../CLAUDE.md) | 🔧 [Bash 模块文档](../bash-permission-hook/CLAUDE.md) | 🪟 [Win Path 模块文档](../win-path-check-hook/CLAUDE.md)