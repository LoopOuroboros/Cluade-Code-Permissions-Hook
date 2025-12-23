/**
 * Windows路径反斜杠自动修正插件
 * 功能：检测Bash命令中未转义的'\'字符，自动修正为正斜杠格式并放行
 * 利用PreToolUse Hook的updatedInput机制实现无感知的路径自动修正
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

    // 1. UNC 路径 (例如 \\server\share)
    // 匹配以 \\ 开头，包含至少一个额外 \ 的非非法字符序列
    const uncPaths = command.match(/(?:^|\s)\\\\[^\\?*"]+(?:\\[^\\?*"]+)+/g);
    if (uncPaths) {
        uncPaths.forEach(p => paths.push(p.trim()));
    }

    // 2. 绝对路径 (例如 C:\Windows)
    // 允许空格以匹配 "Program Files"
    const absolutePaths = command.match(/[A-Za-z]:\\[^\\?*"]*(?:\\[^\\?*"]*)*/g);
    if (absolutePaths) {
        paths.push(...absolutePaths);
    }

    // 3. 显式相对路径 (例如 .\My Documents 或 ..\Data 或 ~\Desktop)
    // 允许空格，但必须以 .\ 或 ..\ 或 ~\ 开头，且包含至少一个后续反斜杠
    const explicitRelativePaths = command.match(/(?:^|\s)(?:\.{1,2}|~)\\[^\\?*"]+(?:\\[^\\?*"]+)+/g);
    if (explicitRelativePaths) {
        explicitRelativePaths.forEach(p => paths.push(p.trim()));
    }

    // 4. 其他相对路径
    // 保持原有逻辑：不匹配包含空格的路径，避免误伤命令参数
    // 排除已匹配的 explicitRelativePaths (通过去重处理，但正则本身重叠可能导致部分匹配)
    // 为了安全，这里仍然只匹配不含空格的
    const relativePaths = command.match(/(?:^|\s)(?!\.|~)[^\s\\?:*"]+\\+(?:[^\\?:*"\s]+\\*)+/g);
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

    paths.forEach(original => {
        let fixed = original;
        
        // 1. 处理 UNC 路径 (\\server -> //server)
        if (original.startsWith('\\\\')) {
            // 保留开头的 //，其余反斜杠转为正斜杠
            fixed = '//' + original.substring(2).replace(/\\+/g, '/');
        } else {
            // 2. 普通路径：将所有反斜杠(包括连续的)替换为单斜杠
            fixed = original.replace(/\\+/g, '/');
        }

        // 3. 智能引用：如果路径包含空格且未被引号包裹，添加引号
        if (fixed.includes(' ')) {
            // 简单的上下文检查：如果原路径在命令中没有被引号包围
            // 这里的检查比较保守，避免双重引用
            const escapedOriginal = original.replace(/\\/g, '\\\\');
            // 检查前后是否有引号 (简单启发式)
            const parts = fixedCommand.split(original);
            if (parts.length >= 2) {
                const prefix = parts[0];
                const suffix = parts[1];
                const hasQuoteBefore = /["']$/.test(prefix);
                const hasQuoteAfter = /^["']/.test(suffix);
                
                if (!hasQuoteBefore || !hasQuoteAfter) {
                    fixed = `"${fixed}"`;
                }
            }
        }
        
        pathReplacements.set(original, fixed);
    });

    // 执行替换（倒序替换避免位置变化）
    // 注意：需要按长度排序，优先替换长路径
    Array.from(pathReplacements.keys())
        .sort((a, b) => b.length - a.length)
        .forEach(original => {
            const fixed = pathReplacements.get(original);
            // 使用 split/join 进行全局替换
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