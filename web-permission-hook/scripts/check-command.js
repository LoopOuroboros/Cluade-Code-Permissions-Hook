#!/usr/bin/env node

/**
 * Claude Code Web 权限钩子
 * 拦截 WebFetch 和 WebSearch 工具调用并推荐使用 MCP 工具
 */

const fs = require('fs');
const path = require('path');

/**
 * 加载工具映射配置
 * @returns {Object} 工具映射字典
 */
function loadToolMappings() {
    try {
        const configPath = path.join(__dirname, '../config/config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return config.toolMappings || {};
    } catch (error) {
        console.error('配置加载失败:', error.message);
        return {};
    }
}

/**
 * 检查工具是否需要替换
 * @param {string} toolName - 工具名称
 * @param {Object} mappings - 工具映射字典
 * @returns {Object} {needReplace: boolean, message?: string}
 */
function checkToolReplacement(toolName, mappings) {
    // 直接查找工具名称映射
    if (mappings[toolName]) {
        return {
            needReplace: true,
            message: `⚠️ ${toolName} 工具被拦截，${mappings[toolName]}`
        };
    }

    return { needReplace: false };
}

/**
 * 主处理函数
 * @param {Object} input - Claude Code传入的JSON参数
 * @returns {Object} 决策响应
 */
function handleHook(input) {
    try {
        // 直接提取工具名称
        const toolName = input.tool_name;

        // 如果工具名称为空，默认放行
        if (!toolName) {
            return {
                hookSpecificOutput: {
                    hookEventName: "PreToolUse",
                    permissionDecision: "allow",
                    permissionDecisionReason: "工具名称为空，已安全放行"
                }
            };
        }

        // 加载工具映射配置
        const mappings = loadToolMappings();

        // 检查是否需要替换
        const result = checkToolReplacement(toolName, mappings);

        if (result.needReplace) {
            return {
                hookSpecificOutput: {
                    hookEventName: "PreToolUse",
                    permissionDecision: "deny",
                    permissionDecisionReason: result.message
                }
            };
        }

        // 不需要替换，允许执行
        return {
            hookSpecificOutput: {
                hookEventName: "PreToolUse",
                permissionDecision: "allow",
                permissionDecisionReason: "工具检查通过，允许执行"
            }
        };

    } catch (error) {
        // 错误时默认放行
        console.error('Hook 错误:', error.message);
        return {
            hookSpecificOutput: {
                hookEventName: "PreToolUse",
                permissionDecision: "allow",
                permissionDecisionReason: "检查过程出错，已安全放行"
            }
        };
    }
}

/**
 * 主入口
 * 从参数读取JSON或从stdin读取
 */
function main() {
    let input;

    if (process.argv.length > 2) {
        // 从命令行参数读取
        input = JSON.parse(process.argv[2]);
    } else {
        // 从stdin读取
        let data = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', chunk => data += chunk);
        process.stdin.on('end', () => {
            input = JSON.parse(data);
            const result = handleHook(input);
            console.log(JSON.stringify(result));
        });
        return;
    }

    const result = handleHook(input);
    console.log(JSON.stringify(result));
}

// 运行
if (require.main === module) {
    main();
}

module.exports = {
    handleHook,
    loadToolMappings,
    checkToolReplacement
};