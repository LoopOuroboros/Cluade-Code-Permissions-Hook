# Claude-Code 权限钩子插件

## 📖 项目简介

Claude-Code 权限钩子插件通过智能钩子系统拦截危险的 Bash 命令，引导用户使用 Claude Code 内置的安全工具，构建更安全的命令执行环境。

## ✨ 核心功能

- **智能命令拦截**：自动识别并拦截危险命令
- **管道位置检测**：区分管道发起端与接收端，安全场景自动放行
- **安全替代推荐**：为每个拦截命令提供 Claude 内置工具代替方案
- **可配置规则系统**：支持动态规则配置和扩展

## 🔧 拦截规则

| 危险命令 | 推荐替代工具 | 说明 |
|---------|-------------|------|
| `find` | `Glob` 工具 | 内置模式匹配 |
| `grep` | `Grep` 工具 | 管道接收端自动放行 |
| `cat/head/tail` | `Read` 工具 | 智能文件读取 |
| `sed` | `Edit` 工具 | 原子性编辑 |
| `awk` | `Grep` + `Read` 组合 | 复杂文本处理 |
| `curl/wget` | `WebFetch`/`WebSearch` | 网络请求 |

## 🚀 安装指南

### 方式一：市场安装（推荐）

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

### 方式二：本地调试（开发用途）

1. 克隆项目到本地：
```bash
git clone https://github.com/LoopOuroboros/Cluade-Code-Permissions-Hook.git
```

2. 同步代码到实际插件运行目录（仅用于开发调试）：
```powershell
# Windows
.\.claude\rules\deploy-plugin.ps1

# Linux/macOS
./.claude/rules/deploy-plugin.sh
```

> **⚠️ 注意**：此方式仅用于插件开发调试。正式安装请使用市场安装方式。

## 💡 使用示例

### 场景1：安全放行（管道场景）
```bash
echo "test" | grep "test"
```
✅ **结果**：自动放行（识别为安全管道操作）

### 场景2：拦截危险命令
```bash
grep "pattern" file.txt
```
⚠️ **结果**：
```json
{
  "decision": "block",
  "reason": "⚠️ grep命令被拦截，使用内置的Grep工具代替"
}
```

## 📁 项目结构

```
├── bash-permission-hook/          # 插件主体
│   ├── scripts/check-command.js   # 核心检查逻辑
│   ├── config/config.json         # 规则配置
│   └── tests/test.js              # 测试套件
├── .claude/rules/                 # 部署规则
└── docs/                          # 设计文档
```

## 📄 许可证

MIT License

## 🤝 贡献指南

详见 [CLAUDE.md](CLAUDE.md)

---

**版本**：v1.0.0