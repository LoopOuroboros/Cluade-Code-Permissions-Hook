#!/usr/bin/env node

/**
 * Claude Code Bash Permission Hook
 * 拦截危险的Bash命令并推荐使用Claude Code内置工具
 */

const fs = require('fs');
const path = require('path');

/**
 * 加载拦截规则
 * @returns {Array} 规则数组
 */
function loadRules() {
    try {
        const configPath = path.join(__dirname, '../config/config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return config.rules || [];
    } catch (error) {
        // 遵循宪法：在错误时默认放行，不输出技术错误信息
        return [];
    }
}

/**
 * 检查命令是否作为管道接收端
 * @param {number} arrayIndex - 命令在 parts 数组中的索引位置
 * @param {Array} partArray - 拆分后的 parts 数组（[cmd0, op, cmd1, op, cmd2]）
 * @returns {boolean} 是否作为管道接收端
 */
function isInPipeReceiver(arrayIndex, partArray) {
    // 如果不是第一个命令，且前一个元素是管道符，则当前命令作为接收端
    return arrayIndex > 0 && partArray[arrayIndex - 1] === '|';
}

/**
 * 提取命令名（支持多词）
 * @param {string} cmd - 命令字符串
 * @returns {string} 处理后的命令名
 */
function extractCommandName(cmd) {
    const trimmed = cmd.trim();
    const firstSpace = trimmed.indexOf(' ');

    if (firstSpace === -1) {
        // 单词命令，移除路径前缀
        return trimmed.replace(/^.*[\/\\]/, '');
    } else {
        // 多词命令，保留前两个词（用于匹配 "npm install"）
        const firstWord = trimmed.substring(0, firstSpace).replace(/^.*[\/\\]/, '');
        const secondWord = trimmed.substring(firstSpace + 1);
        const secondSpacePos = secondWord.indexOf(' ');
        const second = secondSpacePos === -1 ? secondWord : secondWord.substring(0, secondSpacePos);
        return firstWord + ' ' + second;
    }
}

/**
 * 检查单个命令是否被拦截或需要询问
 * @param {string} cmd - 命令字符串
 * @param {Array} rules - 拦截规则数组
 * @param {Object} options - 选项参数
 * @param {boolean} options.isPipeReceiver - 是否作为管道接收端
 * @returns {Object} {decision: "allow"|"deny"|"ask", message?: string}
 */
function checkCommand(cmd, rules, options = {}) {
    const { isPipeReceiver = false } = options;

    // 提取命令名（支持多词）
    const cmdName = extractCommandName(cmd);

    // 查找匹配规则
    for (const rule of rules) {
        // 支持多词匹配（如 "npm install"，匹配 "npm install " 开头或完全相等）
        if (cmdName.startsWith(rule.pattern + ' ') || cmdName === rule.pattern) {
            // 特殊处理：在管道接收端位置且允许的命令时跳过拦截
            if (isPipeReceiver && rule.allowInPipeReceiver) {
                return { decision: "allow" };
            }

            // 提取用于显示的命令名（只显示第一个词）
            const displayName = rule.pattern.split(' ')[0];

            // 根据规则决策返回不同结果
            if (rule.decision === "ask") {
                return {
                    decision: rule.decision,
                    systemMessage: `⚠️ ${displayName}命令需要确认：${rule.suggestion}`
                };
            } else {
                return {
                    decision: rule.decision,
                    permissionDecisionReason: `⚠️ ${displayName}命令被拦截，${rule.suggestion}`
                };
            }
        }
    }

    return { decision: "allow" };
}

/**
 * 主Hook处理函数
 * @param {Object} input - Claude Code传入的JSON参数
 * @returns {Object} 决策响应
 */
function handleHook(input) {
    try {
        // 提取command字段
        const fullCommand = input.tool_input.command;

        // 使用简单分割：分割操作符，生成 [cmd0, op, cmd1, op, cmd2] 数组
        const parts = fullCommand.split(/\s*(\|\||&&|\|)\s*/);

        // 加载规则
        const rules = loadRules();

        // 按顺序检查每个命令（偶数索引是命令）
        for (let i = 0; i < parts.length; i += 2) {
            const cmd = parts[i].trim();
            if (!cmd) continue;

            const isPipeReceiver = isInPipeReceiver(i, parts);

            const decision = checkCommand(cmd, rules, {
                isPipeReceiver: isPipeReceiver
            });

            // "allow" 决策继续检查下一个命令
            if (decision.decision != "allow") {
                const output = {
                    continue: true,
                    hookSpecificOutput: {
                        hookEventName: "PreToolUse",
                        permissionDecision: decision.decision
                    }
                };

                // 根据决策类型将消息放在正确的字段中
                if (decision.decision === "ask") {
                    output.systemMessage = decision.systemMessage;
                } else {
                    output.hookSpecificOutput.permissionDecisionReason = decision.permissionDecisionReason;
                }

                return output;
            }
        }

        // 全部通过，允许执行
        return {
            continue: true,
            hookSpecificOutput: {
                hookEventName: "PreToolUse",
                permissionDecision: "allow"
            }
        };

    } catch (error) {
        // 错误处理：默认放行，不显示技术错误信息
        return {
            continue: true,
            hookSpecificOutput: {
                hookEventName: "PreToolUse",
                permissionDecision: "allow",
                permissionDecisionReason: "钩子执行出错，允许执行"
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
            process.stdout.write(JSON.stringify(result));
        });
        return;
    }

    const result = handleHook(input);
    process.stdout.write(JSON.stringify(result));
}

// 运行
if (require.main === module) {
    main();
}

module.exports = {
    handleHook,
    extractCommandName,
    isInPipeReceiver,
    checkCommand,
    loadRules
};