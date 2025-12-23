# Claude Code 插件管理统一规则

> **📅 更新时间**: 2025-12-22 | **适用项目**: 所有 Claude Code 插件

## 📋 目录

- [快速开始](#快速开始)
- [插件运行路径](#插件运行路径)
- [部署规则](#部署规则)
  - [强制规则：部署状态不可验证](#📜-强制规则部署状态不可验证)
- [测试程序](#测试程序)
- [调试指南](#调试指南)
- [实践案例](#实践案例)
- [常见问题](#常见问题)
- [最佳实践](#最佳实践)

---

## 🚀 快速开始

### 核心原则

**⚠️ 当前项目为插件项目，调试插件必须先运行部署脚本！**

**关键规则**：
- ✅ **必须使用脚本部署**：禁止 `cp`、`rsync`、`robocopy` 等手动复制命令
- ✅ **开发阶段 vs 部署验证**：明确区分测试阶段，部署后必须使用实际命令验证
- ✅ **真实环境是唯一标准**：所有插件测试必须在真实环境中进行

### 三步骤工作流程

```
修改代码 → 部署脚本 → 实际命令验证
    ↓           ↓            ↓
  本地      →  同步      → 真实验证
  开发        文件          环境
```

### 常用命令速查

| 操作 | Windows | Linux/macOS |
|------|---------|-------------|
| **部署插件** | `.\scripts\deploy-plugin.bat bash-permission-hook claude-code-permissions-hook` | `./scripts/deploy-plugin.sh bash-permission-hook claude-code-permissions-hook` |
| **运行测试** | `cd "..\.claude\plugins\cache\..." && node tests\test.js` | `cd "~/.claude/plugins/cache/..." && node tests/test.js` |
| **实际验证** | 在 Claude Code 中执行实际命令 | 在 Claude Code 中执行实际命令 |

---

## 🔍 插件运行路径

### 1. 定位插件位置

插件实际安装路径：

**Windows:**
```powershell
$Env:USERPROFILE\.claude\plugins\cache\<marketplace-name>\<plugin-name>\<version>\
```

**Linux/macOS:**
```bash
~/.claude/plugins/cache/<marketplace-name>/<plugin-name>/<version>/\
```

**示例路径格式：**
- Windows: `$Env:USERPROFILE\.claude\plugins\cache\claude-code-permissions-hook\bash-permission-hook\1.0.0\`
- Linux/macOS: `~/.claude/plugins/cache/claude-code-permissions-hook/bash-permission-hook/1.0.0/`

### 2. 查询已安装插件

查看所有已安装的插件：
```bash
cat ~/.claude/plugins/installed_plugins.json
```

查找特定插件的安装路径：
```bash
cat ~/.claude/plugins/installed_plugins.json | grep -A 5 "bash-permission-hook"
```

### 3. 重要提醒

⚠️ **不要依赖 `CLAUDE_PLUGIN_ROOT` 环境变量** - 该变量可能未正确设置

### 📜 强制规则：部署状态不可验证

**部署脚本执行完成后，无条件信任部署结果！**

- ✅ **部署脚本显示成功后即认为已部署完成**
- ❌ **禁止读取文件、目录、状态、版本号等任何状态检查命令**
- ❌ **禁止使用 `ls`, `dir`, `find`, `cat`, `Read` 等工具验证部署状态**
- ✅ **部署脚本的成功输出是部署完成的唯一凭证**

#### 必须遵守的规则

**❌ 禁止的验证方式：**
```bash
# 部署完成后，绝对禁止进行任何状态检查！

# ❌ 绝对禁止：读文件检查
cat ~/.claude/plugins/installed_plugins.json
cat ~/.claude/plugins/cache/.../version.txt

# ❌ 绝对禁止：列目录检查
ls ~/.claude/plugins/cache/claude-code-permissions-hook/
dir "C:\Users\yyj19\.claude\plugins\cache\..."

# ❌ 绝对禁止：查找插件位置
find ~/.claude/plugins/cache/ -name "check-command.js"

# ❌ 绝对禁止：检查版本号
grep "version" ~/.claude/plugins/cache/.../package.json

# ❌ 绝对禁止：对比文件时间戳
stat ~/.claude/plugins/cache/.../scripts/check-command.js

# ❌ 绝对禁止：验证配置内容
Read ~/.claude/plugins/cache/.../config/config.json
```

**✅ 正确方式：**

```bash
# ✅ 唯一正确的验证方式：部署成功后直接进行真实验证

# 部署脚本成功输出为部署完成的唯一凭证
.\scripts\deploy-plugin.bat bash-permission-hook claude-code-permissions-hook

# ✅ 部署成功后直接进行实际命令测试（在 Claude Code 中）
grep "test" file.txt                          # 验证 bash 插件
WebFetch https://example.com                  # 验证 web 插件
```

#### 核心原则

🎯 **部署脚本的输出就是"真"，无需额外验证**

- 部署脚本成功后，不需要也不应该验证任何文件状态
- 所有状态检查都是冗余的，甚至可能干扰正确性
- 部署脚本本身已经包含了所有必要的同步和验证逻辑
- 信任部署脚本，是简化流程、避免误判的最佳实践

⚠️ **违反规则的后果**：

- 效率低下：浪费时间和资源进行无意义的检查
- 信任危机：如果检查结果与脚本输出不符，不知道该信谁
- 流程复杂化：增加不必要的步骤，降低工作流效率
- 误导性行为：可能因为缓存或上下文问题导致误判

---

## 📦 部署规则

### 🚨 强制规定：必须使用部署脚本

**⚠️ 绝对禁止使用 cp、rsync、robocopy 等手动复制命令部署插件！**

**必须使用的自动化部署脚本：**
- Windows: `.\scripts\deploy-plugin.bat`
- Linux/macOS: `./scripts/deploy-plugin.sh`

#### ❌ 错误方式（禁止）：

```bash
# ❌ 绝对禁止的命令
cp -r ./bash-permission-hook/scripts/* ~/.claude/plugins/cache/...
rsync -av ./web-permission-hook/ ~/.claude/plugins/cache/...
robocopy .\win-path-check-hook\ %USERPROFILE%\.claude\plugins\cache\...
```

#### ✅ 正确方式（必须）：

```powershell
# ✅ Windows 用户
.\scripts\deploy-plugin.bat bash-permission-hook claude-code-permissions-hook
.\scripts\deploy-plugin.bat web-permission-hook claude-code-permissions-hook
.\scripts\deploy-plugin.bat win-path-check-hook claude-code-permissions-hook

# ✅ Linux/macOS 用户
./scripts/deploy-plugin.sh bash-permission-hook claude-code-permissions-hook
./scripts/deploy-plugin.sh web-permission-hook claude-code-permissions-hook
./scripts/deploy-plugin.sh win-path-check-hook claude-code-permissions-hook
```

### 部署脚本功能

部署脚本会自动：
- ✅ 从.plugin.json 读取版本号
- ✅ 同步所有关键文件到实际运行目录
- ✅ 支持 scripts、tests、config、hooks 等关键目录
- ✅ 覆盖已存在的版本目录
- ✅ 显示同步结果和版本信息
- ✅ 跨平台兼容（Windows .bat / Linux/macOS .sh）
- ✅ 支持命令行参数指定插件名称和市场名称

### 部署流程

#### 步骤 1：修改插件代码

在开发目录中修改插件功能：
```bash
# 例如：修改 bash-permission-hook/scripts/check-command.js
```

#### 步骤 2：部署到实际运行目录（必须）

**Windows用户：**
```powershell
# 在项目根目录执行（必须提供插件名）
.\scripts\deploy-plugin.bat bash-permission-hook claude-code-permissions-hook
```

**Linux/macOS用户：**
```bash
# 在项目根目录执行（必须提供插件名）
./scripts/deploy-plugin.sh bash-permission-hook claude-code-permissions-hook
```

#### 步骤 3：验证部署脚本已执行

检查控制台输出是否显示同步成功信息

### 开发目录 → 实际运行目录

假设开发目录为：`./bash-permission-hook/`

实际运行目录格式：

**Windows:**
```powershell
$Env:USERPROFILE\.claude\plugins\cache\claude-code-permissions-hook\bash-permission-hook\1.0.0\
```

**Linux/macOS:**
```bash
~/.claude/plugins/cache/claude-code-permissions-hook/bash-permission-hook/1.0.0/
```

---

## 🧪 测试程序

### ⚠️ 适用范围说明

**开发阶段**：可以使用 `node tests/test.js` 和 JSON 输入测试插件逻辑

**部署验证阶段**：禁止使用 JSON 输入测试，必须用实际命令

### 🚨 严格禁止的测试方式

**🚫 部署后禁止使用 `echo '{"tool_input": {...}}' | node scripts/check-command.js` 进行插件功能验证**

本项目强制禁止在部署后的验证阶段使用直接通过标准输入传递 JSON 的方式验证插件功能。

### 🚨 最关键原因：**测试结果被实际部署版本干扰**！

**部署后的 node 测试会被 Claude Code 实际部署的插件代码干扰，导致返回结果不正确：**

```
❌ 错误的测试流程：
1. 修改本地代码 → scripts/check-command.js
2. 部署插件 → 将修改复制到 ~/.claude/plugins/cache/...
3. 验证部署 → echo '...' | node scripts/check-command.js

❗️ 关键问题：第3步中的 node 命令会被实际部署的插件干扰：
   - Claude Code 启动时会加载 ~/.claude/plugins/cache/.../1.0.0 版本
   - 当你运行 `node scripts/check-command.js` 时，Code 会尝试使用部署的插件代码
   - 测试返回的结果是 **混合版本**（部分本地代码+部分部署代码）
   - 结果完全不可信！

⚠️ 结果：你测试的是被部署版本干扰的混合代码，测试结果完全无效！
```

### 其他原因

#### 1. 环境差异问题
**开发目录 vs 实际运行目录：**
- 开发目录：`./bash-permission-hook/`
- 实际运行目录：`~/.claude/plugins/cache/<市场>/<插件>/<版本>/`
- 路径引用可能导致配置文件加载失败
- 环境变量 `CLAUDE_PLUGIN_ROOT` 可能未正确设置

#### 2. 真实场景不可靠
**Claude Code 主程序调用 vs 直接 Node.js 调用：**
- 插件在实际运行时会有不同的上下文环境
- Claude Code 的工具调用机制与直接脚本执行不同
- 缺少真实的权限检查和工具调用环境
- 无法验证插件与 Claude Code 的完整集成

#### 3. 测试结果误导性
**为什么 JSON 输入测试不可靠：**
```
❌ 错误示例：
echo '{"tool_input": {"command": "grep test file.txt"}}' | node scripts/check-command.js

✅ 正确方式：
在 Claude Code 中直接执行 'grep test file.txt'
```

JSON 输入测试可能显示"工作正常"，但实际在 Claude Code 中可能失败。

### ✅ 必须遵循的流程

#### 步骤 1：修改代码
在开发目录中修改插件功能：
```bash
# 例如修改 bash-permission-hook/scripts/check-command.js
```

#### 步骤 2：部署到实际目录（必须）
```powershell
# Windows
.\scripts\deploy-plugin.bat

# Linux/macOS
./scripts/deploy-plugin.sh
```

#### 步骤 3：验证部署环境状态

**在开始任何测试前，必须确认插件已正确部署：**

**1.1 检查插件是否已安装**
```bash
# 检查已安装插件列表
cat ~/.claude/plugins/installed_plugins.json
```

**1.2 确认插件已同步最新版本**
```powershell
# Windows: 检查插件修改日期
dir "C:\Users\yyj19\.claude\plugins\cache\claude-code-permissions-hook\bash-permission-hook\1.0.0"

# Linux/macOS: 检查插件修改日期
ls -la ~/.claude/plugins/cache/claude-code-permissions-hook/bash-permission-hook/1.0.0
```

**1.3 验证部署脚本已执行**
```bash
# 确认已执行过部署脚本
# ✅ 显示同步成功信息
```

⚠️ **如果部署环境未部署或版本不对，测试结果将无效！**

#### 步骤 4：在真实环境中验证

**Bash Permission Hook 插件：**
```bash
# 在 Claude Code 中执行这些真实命令验证
grep "test" file.txt           # 应该被拦截
echo "test" | grep "test"      # 应该被放行（管道下游）
find . -name "*.js"            # 应该被拦截
cat file.txt                   # 应该被拦截
```

**Web Permission Hook 插件：**
```bash
# 使用 WebFetch/WebSearch 工具验证
# 在 Claude Code 中调用这些工具
```

**win-path-check-hook 插件：**
```bash
# 真实命令验证
cat C:\Users\test.txt          # 应该被拦截（反斜杠）
cat C:/Users/test.txt          # 应该被放行（正斜杠）
```

### 通用验证方式

```bash
# ✅ 在部署目录进行单元测试（仅验证开发逻辑，不测试插件本身）
cd ~/.claude/plugins/cache/<市场>/<插件>/<版本>/
node tests/test.js

# ❌ 部署后绝对不能用：会测试本地代码而非部署版本
echo '{"tool_input":...}' | node scripts/check-command.js

# ✅ 必须方式：在 Claude Code 中执行实际命令测试部署版本
grep "test" file.txt
echo "test" | grep "test"
```

### 🔍 验证清单

| 步骤 | 验证项 | 检查方法 |
|------|--------|----------|
| 1 | 代码修改 | 确保修改已保存到开发目录 |
| 2 | 部署同步 | 运行 `./scripts/deploy-plugin.bat` 并确认成功 |
| 3 | 测试套件 | 在部署目录运行 `node tests/test.js` |
| 4 | 真实测试 | 在 Claude Code 中执行实际工具调用 |
| 5 | 记录结果 | 将测试结果记录到文档 |

### 违反规则的后果

⚠️ **使用 JSON 输入方式测试被视为违规行为**

**后果：**
- 测试结果不可信，可能导致生产环境问题
- 插件在真实环境中可能无法正常工作
- 调试时间延长，问题定位困难
- 可能影响其他开发者的正常工作

---

## 🔍 调试指南

### 为什么不推荐直接使用 node 命令测试？

**测试环境差异**：
- 开发目录 vs 实际运行目录结构不同
- 相对路径引用可能失效
- 环境变量 `CLAUDE_PLUGIN_ROOT` 可能未正确设置
- 配置文件加载路径可能有差异

**真实场景差异**：
- Claude Code 主程序调用插件时会带来不同的上下文
- 插件的实际运行环境与直接运行 Node.js 脚本不同
- 缺少真实的权限检查和工具调用环境

### 🔄 完整调试工作流

#### 步骤 1：修改插件代码

在开发目录中修改插件功能：
```bash
# 例如：修改 bash-permission-hook/scripts/check-command.js
```

#### 步骤 2：部署到实际运行目录（必须）

**Windows用户：**
```powershell
# 在项目根目录执行（必须提供插件名）
.\scripts\deploy-plugin.bat bash-permission-hook claude-code-permissions-hook
```

**Linux/macOS用户：**
```bash
# 在项目根目录执行（必须提供插件名）
./scripts/deploy-plugin.sh bash-permission-hook claude-code-permissions-hook
```

#### 步骤 3：功能验证

**方法一：在 Claude Code 中真实测试（最准确）**

启动 Claude Code，安装本地插件，然后执行真实的 Bash 命令或其他工具：

```bash
# 测试 bash-permission-hook 插件
# 场景1：应该被拦截的命令
grep "test" file.txt
find . -name "*.js"
cat file.txt

# 场景2：应该被放行的命令（管道下游）
echo "test content" | grep "test"
cat file.txt | head -10
```

**方法二：在插件部署目录运行测试套件（仅验证逻辑正确性）**

⚠️ **重要说明**：`node tests/test.js` 仅用于验证开发逻辑，不等同于真实环境测试！

**Windows:**
```powershell
cd "$Env:USERPROFILE\.claude\plugins\cache\claude-code-permissions-hook\bash-permission-hook\1.0.0"
node tests\test.js
```

**Linux/macOS:**
```bash
cd ~/.claude/plugins/cache/claude-code-permissions-hook/bash-permission-hook/1.0.0
node tests/test.js
```

⚠️ **关键区别**：
- ✅ `node tests/test.js` - **测试套件** (单元测试，验证开发逻辑)
- ❌ `echo '{"tool_input":...}' | node scripts/check-command.js` - **禁止的插件测试**

#### 步骤 4：验证特殊场景

根据插件功能，测试特定的命令组合：

**例如测试 grep 管道位置检测：**

```bash
# 这些应该被放行（管道接收端）
echo "test" | grep "test"
find . -name "*.js" | grep "config"
cat file.txt | awk '{print $1}'

# 这些应该被拦截（命令发起端）
grep "pattern" file.txt
find . -name "*.js" .
cat file.txt
```

### 📋 调试检查清单

| 检查项 | 操作方式 | 验证内容 |
|-------|----------|----------|
| 代码修改 | 编辑开发目录文件 | 确保修改符合预期 |
| 部署同步 | 运行 `./scripts/deploy-plugin.bat` | 控制台显示同步成功信息 |
| 测试套件 | 进入插件目录运行 `node tests/test.js` | 测试用例全部通过 |
| 真实命令 | 在 Claude Code 中执行实际工具调用 | 验证行为与预期一致 |
| 日志检查 | 查看 Claude Code 输出 | 确认拦截/放行逻辑正确 |

### 🔍 常见问题排查

#### Q1：修改不生效？

**原因**：忘记运行部署脚本同步到实际目录

**解决**：
```powershell
.\scripts\deploy-plugin.bat
```

#### Q2：测试结果与预期不符？

**原因1**：使用的测试方法不正确

**开发阶段（允许）**：
```bash
# ✅ 本地单元测试
node tests/test.js
echo '{"tool_input": {"command": "..."}}' | node scripts/check-command.js
```

**部署后验证阶段（禁止）**：
```bash
# ❌ 绝对禁止：部署后不能这样测试
echo '{"tool_input": {"command": "grep test file.txt"}}' | node scripts/check-command.js

# ✅ 必须方式：在 Claude Code 中执行实际命令
grep "test" file.txt
echo "test" | grep "test"
```

**原因2**：缓存问题（部署验证阶段）
- 重启 Claude Code 客户端
- 清除插件缓存目录

#### Q3：寻找不到配置文件？

**原因**：路径引用使用了开发目录的相对路径

**解决**：
- 使用 `__dirname` 获取绝对路径
- 参考本文档中的路径指南
- 确保从正确目录读取配置

---

## 💡 最佳实践

### 1. 开发阶段：本地单元测试

```bash
# ✅ 本地开发验证（开发阶段）
cd bash-permission-hook
node tests/test.js

# ✅ 直接测试插件逻辑（开发阶段）
echo '{"tool_input": {"command": "grep test file.txt"}}' | node scripts/check-command.js
```

⚠️ **注意**：这些方法仅在**开发阶段**用于快速验证开发逻辑，不等同于实际环境测试！

### 2. 部署阶段：部署到实际环境

```powershell
# ✅ 部署脚本（必须步骤）
.\scripts\deploy-plugin.bat bash-permission-hook claude-code-permissions-hook
```

### 3. 部署后验证：实际命令测试

```bash
# ✅ 在 Claude Code 中进行实际命令测试（唯一有效方式）
grep "test" file.txt                          #应该被拦截
echo "test" | grep "test"                     #应该被放行
find . -name "*.js"                           #应该被拦截
cat file.txt | head -10                       #应该被放行

# ❌ 绝对禁止：部署后不能使用
echo '{"tool_input": {"command": "grep test file.txt"}}' | node scripts/check-command.js
```

### 4. 持续集成测试流程

```
开发阶段         部署阶段         验证阶段
    ↓              ↓              ↓
 修改代码      →  部署脚本      →  实际命令
   ↓              ↓              ↓
 本地测试      →  同步文件      →  真实验证
   ↓              ↓              ↓
逻辑验证      →  运行测试      →  行为确认
```

---

## 🎯 不同插件的调试要点

### Bash Permission Hook

**重点测试场景：**
- 危险命令拦截：`grep`, `find`, `cat`, `sed`, `awk`
- 管道位置检测：`echo "x" | grep "x"` (应放行)
- 组合命令处理：`find . -name "*.js" | head -5`

**调试命令（真实环境验证）：**
```bash
# 在 Claude Code 中执行这些实际命令验证
```

### Web Permission Hook

**重点测试场景：**
- WebFetch 工具拦截和 MCP 引导
- WebSearch 工具拦截和 MCP 引导
- 工具映射配置正确性

**调试命令：**
```bash
# 在 Claude Code 中使用 WebFetch/WebSearch 工具验证
```

---

## 📋 同步文件清单

以下文件类型需要同步：

1. **scripts/** - 核心功能脚本（必须）
2. **tests/** - 测试文件（推荐）
3. **config/** - 配置文件（有修改时）
4. **hooks/** - 钩子配置文件（有修改时）

---

## 📝 实践案例

### Bash 权限钩子插件流程

**场景**：实现"管道位置智能忽略 grep 命令"功能

**步骤**：
1. ✅ 开发：在 `bash-permission-hook/scripts/check-command.js` 添加函数
2. ✅ 测试：本地运行 `node tests/test.js` 验证逻辑
3. ✅ 部署：使用 `.\scripts\deploy-plugin.bat` 脚本同步到实际目录
4. ✅ 验证：在 Claude Code 真实环境中执行命令确认功能正确
5. ✅ 记录：将规则写入 `.claude/rules/` 供未来参考

**部署前后对比**：

| 场景 | 部署前 | 部署后 |
|------|--------|--------|
| `grep "test" file.txt` | 拦截 ⚠️ | 拦截 ⚠️ |
| `echo "test" \| grep "test"` | 拦截 ⚠️ | 放行 ✅ |

### 验证部署实例

**Windows/Linux/macOS:**
```bash
# 在 Claude Code 中执行这些实际命令验证

# 测试特殊处理逻辑（应该被放行）
echo "test" | grep "test"                     # 管道下游，被放行
cat file.txt | head -10                       # 管道下游，被放行

# 测试普通拦截逻辑（应该被拦截）
grep "test" file.txt                          # 危险命令，被拦截
find . -name "*.js"                           # 危险命令，被拦截
cat file.txt                                  # 危险命令，被拦截

# 预期行为：
# - 管道下游命令正常执行
# - 危险命令被拦截并提示使用替代工具
```

---

## ❓ 常见问题

**Q: 修改文件后立即生效了吗？**
A: 否，必须手动同步到实际运行目录才算完成部署。

**Q: 如何在 Claude Code 中测试插件？**
A: 安装为本地插件（isLocal: true），然后在会话中执行相关命令触发钩子。

**Q: 找不到插件目录？**
A: 使用 `~/.claude/plugins/installed_plugins.json` 查找安装路径。

**⚠️ 基于实际运行是唯一标准**

**重要提醒**：所有插件测试必须在真实环境中进行，才能验证检测逻辑是否正确。仅使用 JSON 输入模拟无法保证插件在实际场景中正常工作。

---

## ⚠️ 注意事项

1. **不要使用相对路径**：`CLAUDE_PLUGIN_ROOT` 环境变量可能未正确设置
2. **保留原目录结构**：确保文件路径与插件预期结构完全一致
3. **版本号**：如果插件有版本号，不要更改运行目录的名称
4. **备份**：重要修改前先备份原始文件

---

## 📚 相关文件

- 插件安装记录：`~/.claude/plugins/installed_plugins.json`
- 插件缓存目录：`~/.claude/plugins/cache/`
- 配置文件：`~/.claude/settings.json`

---

## 📊 规则适用性

此规则适用于：
- ✅ 所有 Claude Code 插件项目
- ✅ 所有插件调试和测试活动
- ✅ 所有插件开发和部署流程
- ✅ 所有验证和测试环节

---

## 🔄 替代方案

如需进行快速验证，请使用：

1. **本地测试套件（开发阶段）：**
```bash
# 在开发目录运行（仅限开发阶段）
cd bash-permission-hook
node tests/test.js
```

2. **部署后完整验证：**
```powershell
# 部署到实际目录
.\scripts\deploy-plugin.bat bash-permission-hook claude-code-permissions-hook

# 在真实目录验证
cd "$Env:USERPROFILE\.claude\plugins\cache\claude-code-permissions-hook\bash-permission-hook\1.0.0"
node tests\test.js
```

3. **集成测试（最准确）：**
```bash
# 在 Claude Code 中进行真实场景测试
# 例如：执行实际 Bash 命令或使用 Web 工具
```

---

## 📝 更新日志

- **2025-12-22**：创建统一规则文档，合并所有分散的规则文件
- **2025-12-22**：
  - 禁止手动复制安装包，必须使用脚本
  - 禁止在部署后使用 node 命令测试
  - 强调被部署代码干扰的问题和强制执行机制
- **2025-12-22**：
  - 改进了部署参数验证，用户名和插件名称是必需的
  - 深入分析调试方法，明确区分测试阶段
- **2025-12-22**：追加新规则 - 部署状态不可验证
  - 部署脚本执行完成后，无条件相信部署结果
  - 禁止使用任何文件/目录/状态检查命令验证部署状态
  - 部署脚本的成功输出是部署完成的唯一凭证

---

## 💬 反馈与贡献

如有问题或改进建议，请在项目仓库创建 Issue。

**核心原则**：
- **基于实际运行是检测逻辑是否正确的唯一标准**
- **插件测试必须在真实环境中进行，而非使用简化的 JSON 输入模拟**