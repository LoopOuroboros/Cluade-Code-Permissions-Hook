/**
 * 上下文分析器 - 分析命令的执行上下文
 */

const { parse } = require('./command-parser');

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
            contexts.push(createCommandContext(node, state));
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
        redirects: node.redirects
    };
}

function getFirstCommand(command) {
    const contexts = analyzeContext(command);
    return contexts[0] || null;
}

module.exports = { analyzeContext, getFirstCommand };
