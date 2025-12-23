# Bash Permission Hook 模块

> 🏠 [返回项目根目录](../CLAUDE.md)

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

## 测试系统

### 测试文件
- `tests/test.js` - 核心功能测试套件

### 运行测试
```bash
# 项目根目录
npm test

# 直接执行
node tests/test.js
```

### 测试覆盖
- ✅ 基础命令拦截
- ✅ 管道位置检测
- ✅ 复合命令拆分
- ✅ 特殊场景处理（grep in pipe）
- ✅ 配置加载验证

## 关键文件

### 🎯 `scripts/check-command.js`
**核心逻辑文件** - 包含所有命令处理逻辑

### ⚙️ `config/config.json`
**配置文件** - 定义拦截规则和提示信息

### 🧪 `tests/test.js`
**测试文件** - 自动化测试用例

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

### 🔧 可扩展架构
- **规则驱动**: 新增命令无需修改核心代码
- **错误容错**: 配置加载失败时默认放行
- **性能优化**: 命令拆分结果缓存

## 部署注意

### 同步要求
⚠️ **修改代码后必须同步到实际插件运行目录**

运行目录格式：
```
~/.claude/plugins/cache/claude-code-permissions-hook/bash-permission-hook/1.0.0/
```

### 验证步骤
1. **自动化部署**：在项目根目录执行 `.\scripts\deploy-plugin.bat`（Windows）或 `./scripts/deploy-plugin.sh`（Linux/macOS）
2. **手动部署**：复制修改文件到运行目录
3. **运行测试**：在插件目标目录执行 `node tests/test.js` 验证功能
4. **手动测试**：测试典型场景，如 `grep` 和 `head` 在管道中的表现

### 部署脚本位置
- **脚本路径**：`项目根目录/scripts/deploy-plugin.bat`（Windows）或 `项目根目录/scripts/deploy-plugin.sh`（Linux/macOS）
- **使用方式**：
  - 默认执行：`deploy-plugin.bat`
  - 指定参数：`deploy-plugin.bat bash-permission-hook claude-code-permissions-hook`
- **功能**：自动读取版本号、同步文件、运行测试验证

## 开发指南

### 添加新拦截规则
1. 在 `config/config.json` 中添加规则配置
2. 在 `tests/test.js` 中添加测试用例
3. 验证特殊场景（如管道位置）
4. 更新部署文档（如需要）

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

- **当前版本**: 1.0.0
- **兼容性**: Node.js >= 14.0.0
- **最后更新**: 2025-12-19