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
        console.error('Failed to load rules:', error.message);
        return [];
    }
}

/**
 * 扩展的命令拆分函数，返回拆分信息和操作符位置
 * @param {string} command - 原始Bash命令
 * @returns {Object} {commands: Array<string>, splits: Array<Object>}
 */
function splitCommandsWithSplits(command) {
    // 操作符定义（按优先级排序）
    const operators = ['&&', '||', '|'];

    // 第一步：查找所有操作符位置
    const splits = [];
    let currentPos = 0;

    while (currentPos < command.length) {
        let foundOp = null;
        let foundPos = -1;

        for (const op of operators) {
            const pos = command.indexOf(op, currentPos);
            if (pos !== -1 && (foundPos === -1 || pos < foundPos)) {
                foundOp = op;
                foundPos = pos;
            }
        }

        if (foundOp === null) {
            break;
        }

        splits.push({
            pos: foundPos,
            op: foundOp,
            len: foundOp.length
        });

        currentPos = foundPos + foundOp.length;
    }

    // 第二步：按位置排序，确保执行顺序
    splits.sort((a, b) => a.pos - b.pos);

    // 第三步：切分命令
    const commands = [];
    let start = 0;

    for (const split of splits) {
        const cmd = command.substring(start, split.pos).trim();
        if (cmd) {
            commands.push(cmd);
        }
        start = split.pos + split.len;
    }

    // 第四步：添加最后一个命令
    const lastCmd = command.substring(start).trim();
    if (lastCmd) {
        commands.push(lastCmd);
    }

    return {
        commands: commands,
        splits: splits
    };
}

/**
 * 检查命令是否作为管道的接收端
 * @param {string} command - 完整的原始命令
 * @param {number} cmdIndex - 当前命令在拆分数组中的索引
 * @param {Array} allCommands - 所有拆分后的命令数组
 * @param {Array} originalSplits - 原始拆分信息（操作符位置）
 * @returns {boolean} 是否作为管道接收端
 */
function isInPipeReceiver(command, cmdIndex, allCommands, originalSplits) {
    // 如果不是第一个命令，且前一个操作符是管道符，则作为接收端
    if (cmdIndex > 0 && cmdIndex <= originalSplits.length) {
        const prevSplit = originalSplits[cmdIndex - 1];
        return prevSplit && prevSplit.op === '|';
    }
    return false;
}

/**
 * 拆分复合命令
 * @param {string} command - 原始Bash命令
 * @returns {Array<string>} 拆分后的命令数组
 */
function splitCommands(command) {
    const result = splitCommandsWithSplits(command);
    return result.commands;
}

/**
 * 检查单个命令是否被拦截
 * @param {string} cmd - 命令字符串
 * @param {Array} rules - 拦截规则数组
 * @param {Object} options - 选项参数
 * @param {boolean} options.isPipeReceiver - 是否作为管道接收端
 * @param {string} options.commandName - 命令名称（用于显示）
 * @returns {Object} {isBlocked: boolean, message?: string}
 */
function checkCommand(cmd, rules, options = {}) {
    const {
        isPipeReceiver = false,
        commandName = null
    } = options;

    // 提取命令名（支持多词）
    let cmdName = cmd.trim();

    // 移除路径前缀
    const firstSpace = cmdName.indexOf(' ');
    if (firstSpace === -1) {
        // 单词命令
        cmdName = cmdName.replace(/^.*[\/\\]/, '');
    } else {
        // 多词命令，保留前两个词（用于匹配 "npm install"）
        const firstWord = cmdName.substring(0, firstSpace).replace(/^.*[\/\\]/, '');
        const secondWord = cmdName.substring(firstSpace + 1);
        const spacePos = secondWord.indexOf(' ');
        const second = spacePos === -1 ? secondWord : secondWord.substring(0, spacePos);
        cmdName = firstWord + ' ' + second;
    }

    // 查找匹配规则
    for (const rule of rules) {
        // 支持多词匹配（如 "npm install"，匹配 "npm install " 开头或完全相等）
        if (cmdName.startsWith(rule.pattern + ' ') || cmdName === rule.pattern) {
            // 特殊处理：在管道接收端位置且允许的命令时跳过拦截
            if (isPipeReceiver && rule.allowInPipeReceiver) {
                return { isBlocked: false };
            }

            // 提取用于显示的命令名（只显示第一个词）
            const displayName = rule.pattern.split(' ')[0];
            return {
                isBlocked: true,
                message: `⚠️ ${displayName}命令被拦截，${rule.suggestion}`
            };
        }
    }

    return { isBlocked: false };
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

        // 使用新的拆分函数获取命令和操作符信息
        const { commands: splitCommands, splits } = splitCommandsWithSplits(fullCommand);

        // 加载规则
        const rules = loadRules();

        // 按顺序检查每个命令
        for (let i = 0; i < splitCommands.length; i++) {
            const cmd = splitCommands[i];
            const isPipeReceiver = isInPipeReceiver(cmd, i, splitCommands, splits);

            const decision = checkCommand(cmd, rules, {
                isPipeReceiver: isPipeReceiver,
                commandName: cmd.trim().split(/\s+/)[0].replace(/^.*[\/\\]/, '')
            });

            if (decision.isBlocked) {
                return {
                    hookSpecificOutput: {
                        hookEventName: "PreToolUse",
                        permissionDecision: "deny",
                        permissionDecisionReason: decision.message
                    }
                };
            }
        }

        // 全部通过，允许执行
        return {
            hookSpecificOutput: {
                hookEventName: "PreToolUse",
                permissionDecision: "allow",
                permissionDecisionReason: "命令通过安全检查"
            }
        };

    } catch (error) {
        // 错误处理：默认放行
        console.error('Hook error:', error.message);
        return {
            hookSpecificOutput: {
                hookEventName: "PreToolUse",
                permissionDecision: "allow",
                permissionDecisionReason: "检查过程中发生错误，已安全放行"
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
    splitCommands,
    splitCommandsWithSplits,
    isInPipeReceiver,
    checkCommand,
    loadRules
};