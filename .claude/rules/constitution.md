# Claude Code 插件测试指南

> **📅 更新时间**: 2025-12-23

## 📋 目录

- [核心原则](#核心原则)
- [快速命令参考](#快速命令参考)
- [命令测试流程](#命令测试流程)
- [钩子验证清单](#钩子验证清单)
- [参考命令集](#参考命令集)
- [故障排查](#故障排查)

---

## 🔑 核心原则

### 当前状态
✅ **插件已部署完成**，无需验证部署状态

### 测试目标
- 验证命令拦截/放行逻辑是否正确
- 验证钩子响应行为是否符合预期

### 核心原则
1. **真实环境测试**：在 Claude Code 中执行实际命令
2. **逐项验证**：每个钩子规则都需要单独测试
3. **边界场景**：必须测试管道位置等边界情况

---

## 🚀 快速命令参考

### 插件部署

```powershell
# Windows
.\scripts\deploy-plugin.ps1

# Linux/macOS
./scripts/deploy-plugin.sh
```

### 插件位置

查看所有已安装的插件：
```bash
cat ~/.claude/plugins/installed_plugins.json
```

bash-permission-hook位置：`~/.claude/plugins/cache/claude-code-permissions-hook/bash-permission-hook/1.0.0/`

### 测试套件

```bash
# 在部署目录运行单元测试
cd ~/.claude/plugins/cache/claude-code-permissions-hook/bash-permission-hook/1.0.0/
node tests/test.js
```

---

## 🧪 命令测试流程

### 阶段 1：基础命令测试

#### Bash Permission Hook

**应拦截的命令：**
```bash
grep "test" file.txt           # 危险命令
find . -name "*.js"            # 文件系统操作
cat file.txt                   # 直接文件读取
sed 's/old/new/' file.txt      # 直接文件编辑
```

**应放行的命令（管道下游）：**
```bash
echo "test" | grep "test"      # 管道接收端
cat file.txt | head -10        # 管道下游处理
find . | grep "config"           # 组合命令
```

**预期行为：**
- 被拦截命令 → 显示警告 + 推荐工具
- 被放行命令 → 正常执行

#### Web Permission Hook

在 Claude Code 中使用 WebFetch/WebSearch 工具验证：
- 应触发钩子并推荐 MCP 服务

## ✅ 钩子验证清单

### 验证项 1：危险命令拦截

**测试命令：** `grep "test" file.txt`

**预期结果：**
- ❌ 命令被拦截
- ✅ 提示使用 `Grep` 工具替代

**状态：** ☐ 未测试 ☐ 通过 ☐ 失败

---

### 验证项 2：管道位置检测

**测试命令：** `echo "test content" | grep "test"`

**预期结果：**
- ✅ 命令被放行
- ✅ 正常执行输出结果

**状态：** ☐ 未测试 ☐ 通过 ☐ 失败

---

### 验证项 3：Web 工具拦截

**测试工具：** WebFetch, WebSearch

**预期结果：**
- ❌ 触发 Web Permission Hook
- ✅ 推荐 MCP 服务替代

**状态：** ☐ 未测试 ☐ 通过 ☐ 失败

---

### 验证项 4：错误提示准确性

**检查要点：**
- [ ] 错误提示清晰易懂
- [ ] 推荐的工具确实可用
- [ ] 提供的示例正确无误

**状态：** ☐ 未测试 ☐ 通过 ☐ 失败

---

### 验证项 5：边界场景

**测试组合：**
```bash
# 场景 1：多管道
cat file.txt | grep "test" | head -5

# 场景 2：复杂命令组合
find . -name "*.js" | xargs grep "function"

# 场景 3：嵌套命令
echo "$(cat config.json | grep "version")"
```

**状态：** ☐ 未测试 ☐ 通过 ☐ 失败

---

## 📚 参考命令集

### Bash Permission Hook

| 命令 | 类别 | 预期结果 |
|------|------|----------|
| `grep "test" file.txt` | 危险命令 | ❌ 拦截 |
| `find . -name "*.js"` | 文件操作 | ❌ 拦截 |
| `cat file.txt` | 文件读取 | ❌ 拦截 |
| `sed 's/x/y/' file` | 文件编辑 | ❌ 拦截 |
| `echo "test" \| grep "test"` | 管道下游 | ✅ 放行 |
| `cat file \| head -10` | 管道下游 | ✅ 放行 |
| `find . \| grep "config"` | 组合命令 | ✅ 放行 |
| `awk '{print $1}' file` | 文本处理 | ❌ 拦截 |

### Web Permission Hook

| 工具 | 预期结果 |
|------|----------|
| WebFetch | ❌ 拦截，推荐 MCP |
| WebSearch | ❌ 拦截，推荐 MCP |

---

## 🔧 故障排查

### 问题 1：命令未被拦截

**可能原因：**
1. 规则配置未包含该命令
2. 部署文件未同步最新配置

**解决方法：**
```powershell
# 1. 检查配置文件
cat ~/.claude/plugins/cache/.../config/config.json

# 2. 重新部署并测试
.\scripts\deploy-plugin.ps1
```

---

### 问题 2：管道命令被拦截

**可能原因：**
1. 管道位置检测未正确识别接收端
2. 命令解析逻辑有误

**调试方法：**
```bash
# 测试简单管道
echo "test" | grep "test"
```

---

### 问题 3：工具推荐不准确

**表现：**
- 推荐不存在的工具
- 示例代码错误

**解决方法：**
1. 检查 `config/config.json` 中的工具映射
2. 更新推荐消息文本

---

## 🎯 测试完成标准

### 必检项
- [ ] 所有危险命令被正确拦截
- [ ] 所有管道下游命令被正确放行
- [ ] 所有 Web 工具触发正确的钩子
- [ ] 错误提示清晰准确

### 边界验证
- [ ] 多管道场景通过测试
- [ ] 复杂命令组合正常工作

---

## 💡 最佳实践

### 1. 分层测试

```bash
# Level 1: 基础功能测试
grep "test" file.txt          # 必须拦截
echo "test" | grep "test"      # 必须放行

# Level 2: 边界场景测试
find . -name "*.js" | grep "config"

# Level 3: 集成测试
# 在真实工作流中验证
```

### 2. 测试记录

- 每次插件修改后记录测试结果
- 保存通过的测试用例作为基准
- 失败用例需修复后重新测试

---

## 📊 测试覆盖率

| 模块 | 测试项 | 状态 |
|------|--------|------|
| Bash Permission Hook | 10个命令 | ☐ 待测试 |
| Web Permission Hook | 2个工具 | ☐ 待测试 |
| 边界场景 | 5个组合 | ☐ 待测试 |
| 错误提示 | 3个检查点 | ☐ 待测试 |

---

## 📝 更新日志

- **2025-12-23**：重构文档，专注命令测试，删除部署验证内容
- **2025-12-22**：原始版本创建

---

## ⚠️ 重要提醒

**基于真实运行是检测逻辑是否正确的唯一标准**

所有插件测试必须在真实环境中进行，才能验证检测逻辑是否正确。实际命令测试比任何本地测试都更准确。

---

## 💬 反馈与贡献

如有问题或改进建议，请在项目仓库创建 Issue。