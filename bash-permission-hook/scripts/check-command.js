#!/usr/bin/env node

/**
 * Claude Code Bash Permission Hook v2.0
 * 智能命令拦截和权限控制
 */

const { makeDecision } = require('./rules/decision-maker');

/**
 * 主Hook处理函数
 * @param {Object} input - Claude Code传入的JSON参数
 * @returns {Object} 决策响应
 */
function handleHook(input) {
    try {
        const fullCommand = input.tool_input.command;

        // WSL命令跳过检测：wsl后面的内容是Linux命令，由WSL环境处理
        const commandLower = (fullCommand || '').trim().toLowerCase();
        if (commandLower.startsWith('wsl ')) {
            return {
                continue: true,
                hookSpecificOutput: {
                    hookEventName: "PreToolUse",
                    permissionDecision: "allow"
                }
            };
        }

        const decision = makeDecision(fullCommand);

        if (decision.decision === 'allow') {
            return {
                continue: true,
                hookSpecificOutput: {
                    hookEventName: "PreToolUse",
                    permissionDecision: "allow"
                }
            };
        }

        const output = {
            continue: true,
            hookSpecificOutput: {
                hookEventName: "PreToolUse",
                permissionDecision: decision.decision
            }
        };

        if (decision.decision === 'ask') {
            output.systemMessage = decision.message;
        } else {
            output.hookSpecificOutput.permissionDecisionReason = decision.message;
        }

        return output;

    } catch (error) {
        return {
            continue: true,
            hookSpecificOutput: {
                hookEventName: "PreToolUse",
                permissionDecision: "allow"
            }
        };
    }
}

/**
 * 主入口
 */
function main() {
    let input;

    if (process.argv.length > 2) {
        input = JSON.parse(process.argv[2]);
    } else {
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

if (require.main === module) {
    main();
}

module.exports = { handleHook };
