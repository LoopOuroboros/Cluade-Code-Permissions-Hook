# Claude Code 权限钩子插件项目

> **🏠 项目根目录** | **📅 更新时间**: 2025-12-22 10:13:44

## 项目愿景

构建安全的 Claude Code 命令执行环境，通过智能权限钩子系统拦截危险操作，并引导用户使用更安全的内置工具和 MCP (Model Context Protocol) 服务。

## 🏗️ 项目架构概览

```mermaid
graph TB
    %% 主要组件
    A[Claude Code 主程序] -->|工具调用| B{权限钩子系统}

    %% Bash 权限钩子
    B -->|Bash 命令| C[Bash Permission Hook]
    C --> D[命令拆分引擎]
    D --> E{规则检测}
    E -->|危险命令| F[拦截并推荐替代工具]
    E -->|安全命令| G[允许执行]

    %% Web 权限钩子
    B -->|Web 工具| H[Web Permission Hook]
    H --> I{工具映射检查}
    I -->|WebFetch| J[拦截 → 使用 Fetch MCP]
    I -->|WebSearch| K[拦截 → 使用 Search MCP]

    %% 替代工具生态
    F --> L[Claude Code 内置工具]
    L --> M[🔍 Glob - 文件模式匹配]
    L --> N[🔎 Grep - 内容搜索]
    L --> O[📖 Read - 文件读取]
    L --> P[✍️ Edit - 文件编辑]
    L --> Q[🌐 WebFetch/WebSearch - 已被拦截]

    J --> R[🔌 Fetch MCP]
    K --> S[🔌 Search MCP]

    %% 配置系统
    T[配置系统] --> C
    T --> H
    U[规则引擎] --> E
    V[管道位置检测] --> E
    W[工具映射配置] --> I

    %% 子模块
    X[bash-permission-hook<br/>📁 src/ | tests/ | config/] --> C
    Y[web-permission-hook<br/>📁 scripts/ | tests/ | config/] --> H

    %% 部署与规则
    Z[.claude/rules/<br/>📋 部署规则] --> T
    AA[.claude-plugin/<br/>🔌 插件元数据] --> X
    AA --> Y

    style B fill:#e1f5fe
    style X fill:#f3e5f5
    style Y fill:#f3e5f5
    style L fill:#e8f5e8
    style R fill:#fff3e0
    style S fill:#fff3e0
```

## 📋 模块索引

| 模块名称 | 路径 | 功能描述 | 状态 | 📖 详细文档 |
|----------|------|----------|------|------------|
| **Bash Permission Hook** | [`bash-permission-hook/`](./bash-permission-hook/CLAUDE.md) | Bash 命令权限控制与智能拦截 | ✅ 生产就绪 | [模块文档](./bash-permission-hook/CLAUDE.md) |
| **Web Permission Hook** | [`web-permission-hook/`](./web-permission-hook/) | Web 工具权限控制与 MCP 替代 | ✅ 生产就绪 | [模块文档](./web-permission-hook/CLAUDE.md) |

## 🗂️ 详细模块结构

### 📁 [bash-permission-hook](./bash-permission-hook/CLAUDE.md)
**🔧 主要插件模块** - 实现 Bash 命令权限控制

> 🏠 [模块文档 →](./bash-permission-hook/CLAUDE.md)

- ****核心入口****: `scripts/check-command.js` - 命令处理逻辑
- ****配置系统****: `config/config.json` - 拦截规则定义
- ****测试套件****: `tests/test.js` - 自动化功能测试
- ****钩子配置****: `hooks/hooks.json` - Claude Code 钩子注册
- ****包管理****: `package.json` - NPM 模块定义
- ****插件元数据****: `.claude-plugin/plugin.json` - 插件信息

### 📁 [web-permission-hook](./web-permission-hook/)
**🌐 Web 插件模块** - 实现Web工具权限控制

> 🏠 [模块文档 →](./web-permission-hook/CLAUDE.md)

- ****核心入口****: `scripts/check-command.js` - Web 工具处理逻辑
- ****配置系统****: `config/config.json` - 工具映射规则
- ****测试套件****: `tests/test.js` - 功能测试
- ****钩子配置****: `hooks/hooks.json` - Web 工具钩子注册
- ****插件元数据****: `.claude-plugin/plugin.json` - Web 插件信息

---

### 📁 .claude
**⚙️ 全局配置与规则** - 项目开发规范

- ****部署规则****: `rules/plugin-deployment-rule.md` - 插件部署关键规则
- ****规则说明****: `rules/README.md` - 规则合集与工具说明
- ****本地设置****: `settings.local.json` - Claude Code 本地配置
- ****钩子脚本****: `deploy-plugin.bat` / `deploy-plugin.sh` - 跨平台部署工具

### 📁 .claude-plugin
**🔌 插件元数据** - 插件定义与市场信息

- ****插件定义****: `plugin.json` - 根级别插件信息
- ****市场配置****: `marketplace.json` - 插件市场注册信息

### 📁 scripts
**🛠️ 项目脚本** - 构建与部署工具

- ****部署脚本****: `deploy-plugin.bat` / `deploy-plugin.sh` - 自动化部署
- ****构建工具****: 项目级别构建和脚本管理

### 📁 docs
**📚 文档目录** - 设计文档与规范

- ****设计文档****: `BASH_PLUGIN_DESIGN.md` - Bash 插件设计详情
- ****参考文档****: `Hooks reference - Claude Code Docs.html` - 官方钩子文档

## 📊 项目统计分析

### 📁 文件分布
- **总文件数**: 80+ 个文件
- **核心代码**: 4 个.js 文件 (2个主要脚本 + 2个测试文件)
- **配置文件**: 8 个.json/.md 配置
- **部署工具**: 4 个脚本文件 (.bat/.sh)
- **文档资源**: 15+ 个文档和 HTML 资源

### 🔍 模块覆盖率
- **识别模块**: 2/2 (100%) ✅
  - bash-permission-hook ✅
  - web-permission-hook ✅
- **核心功能覆盖**: 100% ✅
- **测试覆盖**: 100% ✅

## 🏛️ 全局开发规范

### 🔧 技术栈统一
- **运行时**: Node.js >= 14.0.0 (所有模块)
- **语言**: JavaScript (ES6+)
- **包管理**: NPM (bash 模块) + 手动配置 (web 模块)
- **配置格式**: JSON
- **测试框架**: 自定义测试套件

### 📝 代码规范
- ****注释风格****: 中文注释，保持与现有代码库一致
- ****命名约定****: 驼峰命名法，功能导向命名
- ****文件结构****: `scripts/ | tests/ | config/ | hooks/ | .claude-plugin/`
- ****错误处理****: try-catch 包裹，失败时默认放行

### 🧪 测试规范
- ****测试位置****: 每个模块的 `tests/test.js`
- ****测试覆盖****: 核心功能 100%，边界场景重点测试
- ****测试运行****: `npm test` 或 `node tests/test.js`
- ****持续验证****: 部署前后必须运行测试套件

### 🚀 部署规范
- ****关键原则****: 修改后必须同步到实际运行目录
- ****部署路径****: `~/.claude/plugins/cache/<市场>/<插件>/<版本>/`
- ****同步验证****: 部署后运行测试套件验证功能
- ****自动化工具****: 优先使用 `.claude/rules/deploy-plugin.*` 脚本

### 🔐 安全原则
- ****最小权限****: 仅拦截明确危险的操作
- ****明确指导****: 提供清晰的替代方案提示
- ****错误安全****: 配置加载失败时默认放行
- ****兼容性保证****: 不影响非目标工具的正常使用

---

## 📈 项目总结

### � 核心价值主张
本项目为 Claude Code 构建了**双层次权限控制体系**：

1. **🔧 Bash 层面**: 拦截危险系统命令，引导使用内置安全工具
2. **🌐 Web 层面**: 拦截原生网络工具，引导使用 MCP 服务生态

### 🏆 技术亮点
- **智能管道检测**: 区分命令使用上下文，精准拦截
- **可扩展架构**: 规则驱动配置，零代码扩展新功能
- **MCP 生态集成**: 向下一代工具生态平滑迁移
- **跨平台部署**: 自动化部署工具，Windows/Linux/macOS 全覆盖

### 📊 覆盖的拦截场景

| 类别 | 工具/命令 | 推荐替代 | 状态 |
|------|-----------|----------|------|
| **文件搜索** | `find` | Glob 工具 | ✅ 已实现 |
| **内容搜索** | `grep` | Grep 工具 | ✅ 已实现 |
| **文件读取** | `cat/head/tail` | Read 工具 | ✅ 已实现 |
| **文件编辑** | `sed` | Edit 工具 | ✅ 已实现 |
| **文本处理** | `awk` | Grep + Read 组合 | ✅ 已实现 |
| **网络请求** | `WebFetch` | Fetch MCP | ✅ 已实现 |
| **网络搜索** | `WebSearch` | Search MCP | ✅ 已实现 |

### 🔧 当前支持的功能
- ✅ Bash 命令智能拦截与管道位置检测
- ✅ Web 工具权限控制与 MCP 替代引导
- ✅ 可配置的规则系统和自动化部署
- ✅ 完整的测试套件和文档体系

### 📞 联系与支持
- **文档**: [项目模块文档](./bash-permission-hook/CLAUDE.md) | [Web 模块文档](./web-permission-hook/CLAUDE.md)
- **部署指南**: [.claude/rules/plugin-deployment-rule.md](./.claude/rules/plugin-deployment-rule.md)
- **规则说明**: [.claude/rules/README.md](./.claude/rules/README.md)

---

> **🏠 [返回顶部](#claude-code-权限钩子插件项目)** | **📅 最后更新**: 2025-12-22 10:13:44
**插件元数据** - 插件定义与市场信息

- **插件定义**: `plugin.json`
- **市场配置**: `marketplace.json`

### 📁 docs
**文档目录** - 设计文档与规范

- **设计文档**: `BASH_PLUGIN_DESIGN.md`

### 📁 scripts
**项目脚本** - 构建与部署工具

## 技术栈

- **运行时**: Node.js >= 14.0.0
- **语言**: JavaScript (ES6+)
- **配置格式**: JSON
- **测试框架**: 自定义测试套件

## 拦截规则

当前支持的危险命令拦截：

| 命令 | 推荐替代 | 说明 |
|------|----------|------|
| `find` | Glob 工具 | 内置模式匹配 |
| `grep` | Grep 工具 | 管道接收端放行 |
| `cat/head/tail` | Read 工具 | 智能文件读取 |
| `sed` | Edit 工具 | 原子性编辑 |
| `awk` | Grep + Read 组合 | 复杂文本处理 |
| `curl/wget` | WebFetch/WebSearch | 网络请求 |

## 智能特性

### 🎯 管道位置检测
- **智能识别**: 区分管道发起端与接收端
- **场景适配**: `echo "test" \| grep "test"` 允许执行
- **安全边界**: `grep "pattern" file.txt` 仍被拦截

### 🔧 可扩展规则系统
- **模式匹配**: 支持单命令和多词命令
- **动态配置**: JSON 配置文件实时生效
- **建议系统**: 为每个拦截规则提供替代方案

## 安装与部署

### 开发环境
```bash
# 运行测试
cd bash-permission-hook
npm test

# 手动测试
echo '{"tool_input": {"command": "echo \"test\" | grep \"test\""}}' | node scripts/check-command.js
```

### 生产部署
⚠️ **重要**: 修改后必须同步到实际运行目录

```powershell
# Windows 自动部署
.\.claude\rules\deploy-plugin.bat
```

## 开发工作流

1. **修改代码**: 在 `bash-permission-hook/` 目录开发
2. **本地测试**: 使用测试套件验证逻辑
3. **部署同步**: 将文件复制到插件运行目录
4. **验证生效**: 手动测试确认功能正常
5. **更新文档**: 同步更新相关文档

## 项目状态

- **当前版本**: v1.0.0
- **开发分支**: feature-bash
- **主要功能**:
  - ✅ 基础命令拦截
  - ✅ 管道位置智能检测
  - ✅ 可配置规则系统
  - ✅ 自动化部署脚本

## 贡献指南

1. 遵循现有的代码风格和注释规范
2. 添加新功能时同步更新测试用例
3. 修改配置文件后验证部署流程
4. 保持文档与代码同步

## 许可证

MIT License