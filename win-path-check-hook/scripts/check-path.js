/**
 * Windows路径反斜杠自动修正插件
 * 功能：检测Bash命令中未转义的'\'字符，自动修正为正斜杠格式并放行
 * 利用PreToolUse Hook的updatedInput机制实现无感知的路径自动修正
 */

/**
 * 检测命令中是否包含Windows风格的未转义反斜杠
 */
function checkWindowsPath(input) {
    // 提取命令字符串
    const command = input.tool_input?.command || input.command || '';

    // 如果命令为空或不含反斜杠，直接放行
    if (!command || !command.includes('\\')) {
        return { decision: 'approve' };
    }

    // 检测未转义的反斜杠模式
    const hasUnescapedBackslash = /\\[^\s\\]/g.test(command);

    if (hasUnescapedBackslash) {
        // 自动修正路径并放行
        const fixedCommand = fixWindowsPaths(command);

        return {
            hookSpecificOutput: {
                hookEventName: "PreToolUse",
                permissionDecision: "allow",
                permissionDecisionReason: "已自动将Windows路径转换为正斜杠格式以避免解析错误",
                updatedInput: {
                    command: fixedCommand
                }
            }
        };
    }

    return { decision: 'approve' };
}

/**
 * 生成错误提示信息
 */
function generateErrorMessage(command) {
    // 从命令中提取Windows路径
    const paths = extractWindowsPaths(command);

    if (paths.length === 0) {
        return '⚠️ 检测到Windows路径可能存在未转义的反斜杠';
    }

    // 提取第一个路径作为示例
    const originalPath = paths[0];
    const fixedPath = originalPath.replace(/\\/g, '/');

    return `⚠️ 检测到Windows路径中未转义的反斜杠\n\n原始路径: ${originalPath}\n修正路径: ${fixedPath}`;
}

/**
 * 从命令中提取Windows风格路径
 */
function extractWindowsPaths(command) {
    const paths = [];

    // 匹配Windows风格路径的模式
    // 1. 绝对路径: C:\, D:\ 等
    const absolutePaths = command.match(/[A-Za-z]:\\[^\\]*(?:\\[^\\]*)*/g);
    if (absolutePaths) {
        paths.push(...absolutePaths);
    }

    // 2. 相对路径中的反斜杠
    const relativePaths = command.match(/(?:^|\s)[^\s\\?:*"]+\\+(?:[^\\?:*"\s]+\\*)+/g);
    if (relativePaths) {
        relativePaths.forEach(path => {
            paths.push(path.trim());
        });
    }

    // 去重
    return [...new Set(paths)];
}

/**
 * 自动修正Windows路径为正斜杠格式
 */
function fixWindowsPaths(command) {
    const paths = extractWindowsPaths(command);

    if (paths.length === 0) {
        return command;
    }

    // 修正所有找到的路径
    let fixedCommand = command;
    const pathReplacements = new Map();

    paths.forEach(path => {
        const fixed = path.replace(/\\/g, '/');
        pathReplacements.set(path, fixed);
    });

    // 执行替换（倒序替换避免位置变化）
    Array.from(pathReplacements.keys())
        .sort((a, b) => b.length - a.length)
        .forEach(original => {
            const fixed = pathReplacements.get(original);
            fixedCommand = fixedCommand.split(original).join(fixed);
        });

    return fixedCommand;
}

/**
 * 生成修正建议
 */
function generateSuggestion(command) {
    // 从命令中提取Windows路径并只修正路径部分
    const paths = extractWindowsPaths(command);

    if (paths.length === 0) {
        return '请将路径中的反斜杠 (\\) 替换为正斜杠 (/)';
    }

    // 修正所有找到的路径
    let fixedCommand = command;
    const pathReplacements = new Map();

    paths.forEach(path => {
        const fixed = path.replace(/\\/g, '/');
        pathReplacements.set(path, fixed);
    });

    // 执行替换（倒序替换避免位置变化）
    Array.from(pathReplacements.keys())
        .sort((a, b) => b.length - a.length)
        .forEach(original => {
            const fixed = pathReplacements.get(original);
            fixedCommand = fixedCommand.split(original).join(fixed);
        });

    // 构建简洁的修正建议
    let suggestion = '修正建议:\n';
    paths.forEach((path, index) => {
        const fixed = path.replace(/\\/g, '/');
        suggestion += `${index + 1}) ${path} → ${fixed}\n`;
    });

    suggestion += '\n在Bash中优先使用正斜杠 (/)';
    suggestion += `\n\n完整修正命令:\n${fixedCommand}`;

    return suggestion;
}

// CLI入口点 - 支持标准输入和命令行参数
if (require.main === module) {
    let input = {};
    let stdin = '';

    // 尝试从标准输入读取JSON
    if (!process.stdin.isTTY) {
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', chunk => {
            stdin += chunk;
        });
        process.stdin.on('end', () => {
            if (stdin.trim()) {
                try {
                    input = JSON.parse(stdin);
                } catch (e) {
                    // 解析失败则使用空对象
                }
            }

            // 执行检测并输出结果
            const result = checkWindowsPath(input);
            console.log(JSON.stringify(result));
        });
    } else {
        // 直接从命令行参数读取
        if (process.argv.length > 2) {
            try {
                input = JSON.parse(process.argv[2]);
            } catch (e) {
                // 忽略解析错误
            }
        }
        const result = checkWindowsPath(input);
        console.log(JSON.stringify(result));
    }
}

// 导出函数供测试使用
module.exports = { checkWindowsPath };