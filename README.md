# Claude Code 权限钩子插件

> **构建安全的 Claude Code 命令执行环境**

## 📖 项目简介

本项目通过智能权限钩子系统拦截危险操作，构建安全的 Claude Code 命令执行环境。包含 **Bash 命令控制**、**Web 工具权限控制** 和 **Windows 路径兼容性检查** 三大核心模块，引导用户使用更安全的内置工具和 MCP (Model Context Protocol) 服务。

## 🚀 市场安装

1. 首先注册市场（如未注册）：
```bash
/plugin marketplace add LoopOuroboros/Cluade-Code-Permissions-Hook
```

2. 安装插件：
```bash
/plugin install bash-permission-hook@cluade-code-permissions-hook
/plugin install web-permission-hook@cluade-code-permissions-hook
/plugin install win-path-check-hook@cluade-code-permissions-hook
```

3. 重启 Claude Code 使插件生效


## ✨ 核心功能

- **🔧 Bash 命令拦截**：智能识别危险命令，引导使用 Claude 内置安全工具
- **🌐 Web 工具控制**：拦截原生网络工具，推荐 MCP 服务生态
- **🪟 路径兼容性检查**：自动检测和修正 Windows 路径问题
- **📍 智能管道检测**：区分命令使用场景，精准拦截，管道接收端自动放行
- **⚙️ 可配置规则系统**：规则驱动，零代码扩展新功能
- **🔌 MCP 生态集成**：平滑迁移到下一代工具生态

## 🔧 拦截规则

| 危险命令/工具 | 推荐替代 | 模块 | 说明 |
|-------------|---------|------|------|
| `find` | `Glob` | Bash | 内置模式匹配，智能文件搜索 |
| `grep` | `Grep` | Bash | 管道接收端自动放行 |
| `cat/head/tail` | `Read` | Bash | 智能文件读取 |
| `sed` | `Edit` | Bash | 原子性文件编辑 |
| `awk` | `Grep` + `Read` | Bash | 复杂文本处理组合 |
| `curl/wget` | Fetch/Search MCP | Web | 网络请求引导至 MCP 服务 |
| `WebFetch` | Fetch MCP | Web | 官方 MCP 服务替代 |
| `WebSearch` | Search MCP | Web | 官方 MCP 服务替代 |
| Windows `\` 路径 | Unix `/` 路径 | Win Path | 跨平台路径兼容性 |

## 🚀 安装指南

### 开发环境部署（仅用于开发和调试）

1. 克隆项目到本地：
```bash
git clone https://github.com/LoopOuroboros/Cluade-Code-Permissions-Hook.git
```

2. 部署到 Claude Code 插件运行目录：
```powershell
# Windows
.\scripts\deploy-plugin.ps1

# Linux/macOS
./scripts/deploy-plugin.sh
```

3. 重启 Claude Code 使插件生效

> **⚠️ 注意**：此方式仅用于插件开发和调试。插件已部署在生产环境并自动同步更新。

## 💡 使用示例

### 场景1：安全放行（管道接收端）
```bash
echo "test" | grep "test"
```
✅ **结果**：自动放行（识别为管道接收端安全操作）

### 场景2：拦截 Bash 命令
```bash
grep "pattern" file.txt
```
⚠️ **结果**：
```
⚠️ grep命令被拦截，使用内置的Grep工具代替
```

### 场景3：Web 工具拦截
用户尝试使用 `WebFetch` → 提示使用 Fetch MCP 服务

### 场景4：路径自动修正
输入 Windows 路径 → 自动转换为 Unix 格式或给出修正提示

## 📁 项目结构

```
├── bash-permission-hook/          # Bash 命令权限控制模块
│   ├── scripts/check-command.js   # 核心检查逻辑
│   ├── config/config.json         # 拦截规则配置
│   ├── hooks/hooks.json          # 钩子注册配置
│   └── .claude-plugin/plugin.json # 插件元数据
├── web-permission-hook/           # Web 工具权限控制模块
│   ├── scripts/check-command.js   # Web 工具处理逻辑
│   ├── config/config.json         # 工具映射规则
│   ├── hooks/hooks.json          # Web 钩子注册
│   └── .claude-plugin/plugin.json # Web 插件元数据
├── win-path-check-hook/           # Windows 路径兼容性检查模块
│   ├── scripts/check-path.js      # 路径检查逻辑
│   ├── hooks/hooks.json          # 路径钩子注册
│   └── .claude-plugin/plugin.json # 插件元数据
├── scripts/                       # 项目部署脚本
│   ├── deploy-plugin.ps1         # Windows 自动化部署
│   └── deploy-plugin.sh          # Linux/macOS 自动化部署
├── .claude/                       # 全局配置与规范
│   ├── rules/constitution.md     # 核心规范文档
│   └── settings.local.json       # 本地配置
├── .claude-plugin/                # 插件市场配置
│   ├── marketplace.json          # 市场注册信息
│   └── CLAUDE.md                 # 配置中心说明
└── CLAUDE.md                      # 项目完整文档
```

## 📄 许可证

MIT License

## 🤝 贡献指南

详见 [CLAUDE.md](CLAUDE.md) - 包含详细的项目文档、模块说明和开发规范。

---

**版本**：v1.2.0