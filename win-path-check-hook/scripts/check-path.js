#!/usr/bin/env node

/**
 * Windows路径转义问题检测与智能修正插件 (重构版)
 *
 * 功能：
 * - 检测Bash命令中的Windows路径格式问题
 * - 对带引号的Windows路径自动修正为正斜杠
 * - 对无引号的Windows路径提供友好提示（建议使用引号）
 * - 提供清晰的错误提示和替代方案
 *
 * @author Claude Code Permissions Hook Project
 * @version 2.0.1
 */

// 读取标准输入
const input = JSON.parse(require('fs').readFileSync(0, 'utf8'));

/**
 * 检测Windows路径问题的主要函数
 * @param {string} command - 完整的Bash命令
 * @returns {Object} 检测结果和修正建议
 */
function detectAndFixWindowsPathIssues(command) {
    // 如果命令为空，直接放行
    if (!command || command.trim() === '') {
        return { shouldAllow: true, fixedCommand: command };
    }

    let fixedCommand = command;
    let hasQuotedPaths = false;
    let hasUnquotedWindowsPaths = false;

    // 分析命令中的参数（正确处理带引号的参数）
    const args = parseCommandLine(command);

    // 跳过第一个参数（命令名）
    for (let i = 1; i < args.length; i++) {
        const arg = args[i];

        // 检查是否是带引号的Windows路径
        if ((arg.startsWith('"') && arg.endsWith('"')) ||
            (arg.startsWith("'") && arg.endsWith("'"))) {
            const unquoted = arg.slice(1, -1);
            if (isWindowsPath(unquoted)) {
                hasQuotedPaths = true;
                // 自动修正带引号的Windows路径
                const fixedUnquoted = fixWindowsPath(unquoted);
                if (fixedUnquoted !== unquoted) {
                    fixedCommand = fixedCommand.replace(arg, `"${fixedUnquoted}"`);
                }
            }
        }
        // 检查是否是无引号的Windows路径模式
        else if (isWindowsPathPattern(arg)) {
            hasUnquotedWindowsPaths = true;
        }
    }

    // 如果有无引号的Windows路径，建议用户使用引号
    if (hasUnquotedWindowsPaths) {
        return {
            shouldAllow: false,
            reason: `⚠️ 命令中包含无引号的Windows路径（如 C:\\file.txt 或 Projects\\repo）。在Bash中，反斜杠会被解释为转义字符，导致路径损坏。请使用引号包裹路径，例如："C:\\\\file.txt"，这样插件可以自动修正为跨平台兼容的正斜杠路径。`
        };
    }

    // 如果有带引号的Windows路径且已修正
    if (hasQuotedPaths && fixedCommand !== command) {
        return {
            shouldAllow: true,
            fixedCommand: fixedCommand,
            originalCommand: command
        };
    }

    // 没有问题，直接放行
    return { shouldAllow: true, fixedCommand: command };
}

/**
 * 检查字符串是否为常见的转义序列（用于排除JSON等场景）
 * @param {string} str - 要检查的字符串
 * @returns {boolean} 是否为转义序列
 */
function isEscapeSequence(str) {
    // 常见转义序列模式：\n, \t, \r, \b, \f, \0, \", \', \\
    // 以及 \uXXXX (Unicode转义)
    return /^\$[a-zA-Z]|\\[ntrbf0\\'"]|\\x[0-9a-fA-F]{2}|\\u[0-9a-fA-F]{4}$/.test(str);
}

/**
 * 检查字符串是否包含Windows路径特征
 * @param {string} str - 要检查的字符串
 * @returns {boolean} 是否为Windows路径
 */
function isWindowsPath(str) {
    // Linux绝对路径豁免：以/开头的路径（包括WSL的/mnt/路径）直接返回false
    if (str.startsWith('/')) {
        return false;
    }

    // 排除JSON结构体：以 { 或 [ 开头的内容很可能是JSON
    // 此时如果包含反斜杠，很可能是转义序列而不是路径
    if ((str.startsWith('{') || str.startsWith('[')) && /\\/.test(str)) {
        return false;
    }

    // 排除明显是转义序列的内容
    if (isEscapeSequence(str)) {
        return false;
    }

    // 检查驱动器路径 C:\ 或 UNC路径 \\server\
    if (/^[A-Za-z]:[\\\/]|^\\\\/.test(str)) {
        return true;
    }
    // 检查混合路径模式
    if (/[A-Za-z]:[\\\/][^"\s]*|[\\\/][^"\s]*[\\\/]/.test(str)) {
        return true;
    }

    return false;
}

/**
 * 检查字符串是否匹配无引号Windows路径模式
 * @param {string} str - 要检查的字符串
 * @returns {boolean} 是否匹配无引号Windows路径模式
 */
function isWindowsPathPattern(str) {
    // Linux绝对路径豁免：以/开头的路径（包括WSL的/mnt/路径）直接返回false
    if (str.startsWith('/')) {
        return false;
    }

    // 排除JSON结构体
    if ((str.startsWith('{') || str.startsWith('[')) && /\\/.test(str)) {
        return false;
    }

    // 检测可能的Windows路径模式（包含反斜杠但无引号）
    // 驱动器字母 + 冒号 + 反斜杠模式 (C:\file.txt)
    if (/^[A-Za-z]:\\/.test(str)) {
        return true;
    }
    // UNC路径模式 (\\server\share)
    if (str.startsWith('\\\\')) {
        return true;
    }

    // 排除转义序列相关的反斜杠模式
    // 反斜杠后面紧跟引号、另一个反斜杠或特定转义字符的，可能是转义序列而不是路径
    // 如 \"、\'、\\、\n、\t 等
    if (/\\[\\"'ntrbf0]/.test(str)) {
        return false;
    }

    return false;
}

/**
 * 修正Windows路径中的反斜杠为正斜杠
 * @param {string} path - Windows路径
 * @returns {string} 修正后的路径
 */
function fixWindowsPath(path) {
    let fixed = path;
    // 处理驱动器路径 C:\Users\... -> C:/Users/...
    fixed = fixed.replace(/^([A-Za-z]):\\/, '$1:/');
    // 处理UNC路径 \\server\share -> //server/share
    fixed = fixed.replace(/^\\\\([^\\])/g, '//$1');
    // 处理其他反斜杠 -> 正斜杠
    fixed = fixed.replace(/\\/g, '/');
    return fixed;
}

/**
 * 解析命令行参数，正确处理带引号的参数
 * @param {string} command - 完整的命令字符串
 * @returns {Array<string>} 解析后的参数数组
 */
function parseCommandLine(command) {
    const args = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    let i = 0;

    while (i < command.length) {
        const char = command[i];

        if (char === ' ' && !inQuotes) {
            if (current !== '') {
                args.push(current);
                current = '';
            }
        } else if ((char === '"' || char === "'") && !inQuotes) {
            inQuotes = true;
            quoteChar = char;
            current += char;
        } else if (char === quoteChar && inQuotes) {
            inQuotes = false;
            quoteChar = '';
            current += char;
        } else {
            current += char;
        }
        i++;
    }

    if (current !== '') {
        args.push(current);
    }

    return args.filter(arg => arg.length > 0);
}

/**
 * 主钩子处理函数
 * @param {Object} input - Claude Code传入的钩子输入
 * @returns {Object} 钩子输出响应
 */
function handleHook(input) {
    try {
        // 获取命令内容
        const command = input?.tool_input?.command;

        if (!command) {
            // 如果没有命令，放行
            return {
                continue: true,
                hookSpecificOutput: {
                    hookEventName: "PreToolUse",
                    permissionDecision: "allow"
                }
            };
        }

        // WSL命令跳过检测：wsl后面的内容是Linux命令，由WSL环境处理，不属于Windows路径范畴
        const commandLower = command.trim().toLowerCase();
        if (commandLower.startsWith('wsl ')) {
            return {
                continue: true,
                hookSpecificOutput: {
                    hookEventName: "PreToolUse",
                    permissionDecision: "allow"
                }
            };
        }

        // 检测和修正路径问题
        const result = detectAndFixWindowsPathIssues(command);

        if (result.shouldAllow) {
            if (result.fixedCommand && result.fixedCommand !== command) {
                // 返回修正后的命令
                return {
                    continue: true,
                    hookSpecificOutput: {
                        hookEventName: "PreToolUse",
                        permissionDecision: "allow",
                        updatedInput: {
                            command: result.fixedCommand
                        }
                    }
                };
            } else {
                // 无需修正，直接放行
                return {
                    continue: true,
                    hookSpecificOutput: {
                        hookEventName: "PreToolUse",
                        permissionDecision: "allow"
                    }
                };
            }
        } else {
            // 拦截并提供友好提示
            return {
                continue: true,
                hookSpecificOutput: {
                    hookEventName: "PreToolUse",
                    permissionDecision: "deny",
                    permissionDecisionReason: result.reason
                }
            };
        }
    } catch (error) {
        // 错误情况下默认放行，避免阻塞正常操作
        console.error('Path check hook error:', error.message);
        return {
            continue: true,
            hookSpecificOutput: {
                hookEventName: "PreToolUse",
                permissionDecision: "allow"
            }
        };
    }
}

// 执行主函数并输出结果
const output = handleHook(input);
console.log(JSON.stringify(output));
