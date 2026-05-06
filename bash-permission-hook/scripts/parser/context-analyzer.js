/**
 * 上下文分析器 - 分析命令的执行上下文
 * 支持包装命令（wsl/docker/ssh/bash -c）的递归分析
 */

const { parse } = require('./command-parser');
const { loadWrapperConfig } = require('../rules/rule-engine');

function analyzeContext(command) {
    const ast = parse(command);
    const contexts = [];

    traverseAst(ast, contexts, {
        inPipeline: false,
        inConditional: false,
        pipelineIndex: 0,
        pipelineLength: 0
    });

    return contexts;
}

function traverseAst(node, contexts, state) {
    if (!node) return;

    switch (node.type) {
        case 'command':
            const cmdContext = createCommandContext(node, state);
            contexts.push(cmdContext);

            // 检查是否是包装命令，提取内部命令并递归分析
            const innerCommand = extractInnerCommand(cmdContext);
            if (innerCommand) {
                try {
                    const innerAst = parse(innerCommand);
                    // 判断是否是WSL包装命令，将上下文传递下去
                    const isWslWrapper = cmdContext.command === 'wsl';
                    traverseAst(innerAst, contexts, {
                        inPipeline: false,
                        inConditional: false,
                        pipelineIndex: 0,
                        pipelineLength: 0,
                        fromWsl: isWslWrapper || state.fromWsl || false
                    });
                } catch (e) {
                    // 内部命令解析失败时静默跳过
                }
            }
            break;

        case 'pipeline':
            node.children.forEach((child, index) => {
                traverseAst(child, contexts, {
                    inPipeline: true,
                    inConditional: state.inConditional,
                    pipelineIndex: index,
                    pipelineLength: node.children.length
                });
            });
            break;

        case 'and':
        case 'or':
            traverseAst(node.children[0], contexts, {
                ...state,
                inConditional: false
            });
            traverseAst(node.children[1], contexts, {
                ...state,
                inConditional: true
            });
            break;

        case 'sequence':
            node.children.forEach(child => {
                traverseAst(child, contexts, {
                    ...state,
                    inConditional: false
                });
            });
            break;
    }
}

/**
 * 从包装命令中提取内部命令
 * @param {Object} context - 命令上下文
 * @returns {string|null} 提取的内部命令或 null
 */
function extractInnerCommand(context) {
    const commandName = context.command;
    const args = context.args || [];

    // 检查是否是已知的包装命令（配置驱动）
    for (const [wrapperType, config] of Object.entries(loadWrapperConfig())) {
        if (config.triggers.includes(commandName)) {
            return extractByConfig(context, config);
        }
    }

    return null;
}

/**
 * 根据配置提取内部命令
 * @param {Object} context - 命令上下文
 * @param {Object} config - 包装命令配置
 * @returns {string|null}
 */
function extractByConfig(context, config) {
    const args = context.args || [];

    // 模式 1: 在 -c/--command 标志后提取
    if (config.commandFlags) {
        for (const flag of config.commandFlags) {
            const flagIndex = args.indexOf(flag);
            if (flagIndex !== -1 && flagIndex + 1 < args.length) {
                return args[flagIndex + 1];
            }
        }
    }

    // 模式 2: 从最后一个参数提取（ssh、wsl 等）
    if (config.extractFromLastArg && args.length > 0) {
        // 检查最后一个参数是否看起来像命令（包含空格或特殊字符）
        const lastArg = args[args.length - 1];
        if (lastArg && (lastArg.includes(' ') ||
                          lastArg.includes('|') ||
                          lastArg.includes('>') ||
                          lastArg.includes(';'))) {
            return lastArg;
        }
    }

    return null;
}

function createCommandContext(node, state) {
    const redirects = node.redirects || [];
    const redirectTargets = redirects.map(r => r.target);
    const hasRedirectToNull = redirectTargets.some(t =>
        t === '/dev/null' || t === 'nul' || t === 'NUL'
    );
    const hasFileOutput = redirects.some(r =>
        (r.type === 'out' || r.type === 'append') &&
        r.target !== '/dev/null' && r.target !== 'nul' && r.target !== 'NUL'
    );

    return {
        isInPipeline: state.inPipeline,
        isPipeSender: state.inPipeline && state.pipelineIndex < state.pipelineLength - 1,
        isPipeReceiver: state.inPipeline && state.pipelineIndex > 0,
        hasRedirectToNull,
        hasFileOutput,
        isInConditional: state.inConditional,
        redirectTargets,
        command: node.command,
        args: node.args,
        redirects: node.redirects,
        fromWsl: state.fromWsl || false
    };
}

function getFirstCommand(command) {
    const contexts = analyzeContext(command);
    return contexts[0] || null;
}

module.exports = { analyzeContext, getFirstCommand };
