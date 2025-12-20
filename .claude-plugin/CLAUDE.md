# Claude插件市场配置中心

[← 返回根目录](../CLAUDE.md)

## 配置概述

所有Claude Code权限管理插件的集中管理配置文件。

## 配置文件

### 1. marketplace.json

**位置**: `.claude-plugin/marketplace.json`

**内容**:
```json
{
  "listings": [
    {
      "name": "bash-permission-hook",
      "type": "security",
      "enabled": true,
      "description": "拦截危险的Bash命令并推荐Claude原生工具"
    },
    {
      "name": "curl-permission-hook",
      "type": "security",
      "enabled": true,
      "description": "带智能工具推荐的网络请求安全控制"
    }
  ]
}
```

## 插件状态

| 插件 | 状态 | 类型 | 功能 |
|--------|--------|------|---------------|
| bash-permission-hook | ✅ 已启用 | 安全 | Bash命令拦截 |
| curl-permission-hook | ✅ 已启用 | 安全 | 网络请求控制 |

## 管理命令

### 启用/禁用插件

```bash
# 查看插件列表
claude plugin list

# 启用插件
claude plugin enable bash-permission-hook

# 禁用插件
claude plugin disable bash-permission-hook
```

### 安装新插件

```bash
# 从目录安装
claude plugin install ./bash-permission-hook --scope user

# 从Git仓库安装
claude plugin install git+https://github.com/user/plugin.git
```

## 安全策略

### 规则优先级

1. **本地网络** → 允许访问
2. **允许模式** → 精确匹配允许
3. **其他** → 阻止并提供建议

### 推荐的工具映射

- `find` → `Glob`
- `grep` → `Grep`
- `cat` → `Read`
- `sed` → `Edit`
- `curl` → `WebFetch`
- `wget` → `WebSearch`

---

**导航路径**: [根目录](../CLAUDE.md) / .claude-plugin