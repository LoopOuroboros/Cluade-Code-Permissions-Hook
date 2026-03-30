/**
 * 决策制定器 - 根据规则和上下文做出最终决策
 */

const { analyzeContext } = require('../parser/context-analyzer');
const { loadRules, matchRule } = require('./rule-engine');

function makeDecision(command) {
    try {
        const contexts = analyzeContext(command);
        const rules = loadRules();

        for (const context of contexts) {
            const decision = evaluateCommand(context, rules);
            if (decision.decision !== 'allow') {
                return decision;
            }
        }

        return { decision: 'allow' };
    } catch (error) {
        return { decision: 'allow' };
    }
}

function evaluateCommand(context, rules) {
    const commandName = context.command;
    const args = context.args || [];

    if (commandName === 'echo') {
        return handleEcho(context);
    }

    if (commandName === 'head' || commandName === 'tail') {
        return handleHeadTail(context);
    }

    if (commandName === 'cat') {
        return handleCat(context);
    }

    const rule = matchRule(commandName, args, context, rules);
    if (rule) {
        const displayName = rule.pattern.split(' ')[0];
        if (rule.decision === 'ask') {
            return {
                decision: 'ask',
                message: `⚠️ ${displayName}命令需要确认：${rule.suggestion}`,
                commandName: displayName
            };
        } else {
            return {
                decision: 'deny',
                message: `⚠️ ${displayName}命令被拦截，${rule.suggestion}`,
                commandName: displayName
            };
        }
    }

    return { decision: 'allow' };
}

function handleEcho(context) {
    if (context.hasFileOutput) {
        return {
            decision: 'deny',
            message: '⚠️ echo命令被拦截，禁止使用echo写入文件，请使用Edit工具',
            commandName: 'echo'
        };
    }

    return { decision: 'allow' };
}

function handleHeadTail(context) {
    const args = context.args || [];
    const commandName = context.command;

    if (context.isPipeReceiver) {
        return { decision: 'allow' };
    }

    if (context.isPipeSender) {
        return { decision: 'allow' };
    }

    if (args.includes('-f') || args.includes('--follow')) {
        return { decision: 'allow' };
    }

    const lineCount = extractLineCount(args);
    if (lineCount !== null && lineCount <= 100) {
        return { decision: 'allow' };
    }

    return {
        decision: 'deny',
        message: `⚠️ ${commandName}命令被拦截，请使用Read工具读取文件`,
        commandName: commandName
    };
}

function handleCat(context) {
    if (context.isPipeSender) {
        return { decision: 'allow' };
    }

    if (context.isPipeReceiver) {
        return { decision: 'allow' };
    }

    return {
        decision: 'deny',
        message: '⚠️ cat命令被拦截，使用内置的Read工具代替',
        commandName: 'cat'
    };
}

function extractLineCount(args) {
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '-n' && i + 1 < args.length) {
            const num = parseInt(args[i + 1], 10);
            if (!isNaN(num)) return num;
        }
        if (arg.startsWith('-n')) {
            const num = parseInt(arg.substring(2), 10);
            if (!isNaN(num)) return num;
        }
        if (/^-\d+$/.test(arg)) {
            const num = parseInt(arg.substring(1), 10);
            if (!isNaN(num)) return num;
        }
    }
    return null;
}

module.exports = { makeDecision };
