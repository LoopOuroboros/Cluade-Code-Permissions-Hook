# Windows Bash路径检测插件

> **版本**: 1.0.0 | **平台**: Windows

## 功能简介

智能检测Windows环境下Bash命令中的路径问题，拦截包含未转义反斜杠的命令，并提供修正建议。

## 工作原理

当执行Bash命令时，插件会检测命令中是否包含可能引起问题的未转义反斜杠，并：

- ✅ **安全命令**：直接放行
- ⚠️ **问题命令**：拦截并提供详细的错误信息和修正建议

## 检测场景

| 原始命令 | 问题说明 | 修正建议 |
|----------|----------|----------|
| `cat C:\Users\test.txt` | 反斜杠被Bash解释为转义 | `cat C:/Users/test.txt` |
| `ls C:\Program Files\app\` | 空格会导致路径断裂 | `ls "C:/Program Files/app/"` |
| `cd C:\Users\home\..` | 点号被错误解析 | `cd C:/Users/home/..` |

## 安装方式

### ⚠️ 必须使用脚本部署，禁止手动复制！

```bash
# ✅ 正确方式：使用自动化部署脚本
# 脚本会从 plugin.json 读取版本号并同步文件

.\scripts\deploy-plugin.bat win-path-check-hook claude-code-permissions-hook

# 或 Linux/macOS:
./scripts/deploy-plugin.sh win-path-check-hook claude-code-permissions-hook
```

### ❌ 禁用方式（禁止使用）

```bash
# 绝对禁止：手动复制粘贴
cp -r win-path-check-hook ~/.claude/plugins/cache/win-path-check-hook/1.0.0/
```

⚠️ **关键原因**：手动复制会被项目规则强制跟踪，**自动部署脚本是唯一正确的部署方式**！

## 测试验证

**详细的测试流程请参考项目级规则文档：**

- **部署规则**: [`.claude/rules/plugin-deployment-rule.md`](../.claude/rules/plugin-deployment-rule.md)
- **调试指南**: [`.claude/rules/plugin-debugging-rule.md`](../.claude/rules/plugin-debugging-rule.md)
- **测试强制规则**: [`.claude/rules/plugin-testing-prohibition-rule.md`](../.claude/rules/plugin-testing-prohibition-rule.md)

⚠️ **重要**: 所有测试必须遵循 `.claude/rules/` 中的统一规则

## 输出示例

### 拦截示例
```json
{
  "decision": "block",
  "reason": "⚠️ 检测到Windows路径可能存在未转义的反斜杠\n\n原始命令: cat C:\\Users\\test.txt\n...",
  "suggestion": "修正建议:\ncat C:/Users/test.txt\n\n详细说明:\n..."
}
```

### 放行示例
```json
{
  "decision": "approve"
}
```

## 技术说明

- **核心逻辑**: regex `/\\[^\s\\]/g` 检测未转义反斜杠
- **性能**: 无配置加载，直接字符串检测，速度极快
- **兼容性**: Node.js 14+

## 许可证

MIT License

---

> **提示**: 插件基于简单高效设计，无复杂配置，开箱即用。