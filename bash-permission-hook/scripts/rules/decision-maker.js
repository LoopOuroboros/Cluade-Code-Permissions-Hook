/**
 * 决策制定器 - 根据规则和上下文做出最终决策
 * 所有命令拦截逻辑由 config.json 驱动，无硬编码
 */

const { analyzeContext } = require('../parser/context-analyzer');
const { loadRules, matchRule, matchSpecialCommand, handleGitCommand } = require('./rule-engine');

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

    // 1. 先查 specialCommands 配置（echo/cat/head/tail 等）
    const specialResult = matchSpecialCommand(commandName, context.args || [], context);
    if (specialResult !== null) {
        return specialResult;
    }

    // 2. 再查 gitClassification 配置
    if (commandName === 'git') {
        const gitResult = handleGitCommand(context);
        if (gitResult !== null) {
            return gitResult;
        }
    }

    // 3. 最后走 rules 数组匹配
    const rule = matchRule(commandName, context.args || [], context, rules);
    if (rule) {
        if (context.fromWsl && rule.allowInWsl === true) {
            return { decision: 'allow' };
        }

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

module.exports = { makeDecision };
