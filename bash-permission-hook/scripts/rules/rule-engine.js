/**
 * 规则引擎 - 定义和执行拦截规则
 */

const fs = require('fs');
const path = require('path');

let rulesCache = null;

function loadRules() {
    if (rulesCache) {
        return rulesCache;
    }

    try {
        const configPath = path.join(__dirname, '../../config/config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        rulesCache = config.rules || [];
        return rulesCache;
    } catch (error) {
        return [];
    }
}

function matchRule(commandName, args, context, rules) {
    const cleanCommand = commandName.replace(/^.*[\/\\]/, '');

    for (const rule of rules) {
        if (ruleMatches(cleanCommand, args, context, rule)) {
            return rule;
        }
    }

    return null;
}

function ruleMatches(commandName, args, context, rule) {
    const pattern = rule.pattern;
    const patternParts = pattern.split(' ');

    if (patternParts.length > 1) {
        const fullCommand = [commandName, ...args].join(' ');
        if (!fullCommand.startsWith(pattern + ' ') && fullCommand !== pattern) {
            return false;
        }
    } else {
        if (commandName !== pattern) {
            return false;
        }
    }

    if (rule.allowInPipeReceiver && context.isPipeReceiver) {
        return false;
    }
    if (rule.allowInPipeSender && context.isPipeSender) {
        return false;
    }
    if (rule.allowInConditional && context.isInConditional) {
        return false;
    }
    if (rule.allowInWsl && context.fromWsl) {
        return false;
    }

    if (rule.conditions) {
        if (!checkAdvancedConditions(commandName, args, context, rule.conditions)) {
            return false;
        }
    }

    return true;
}

function checkAdvancedConditions(commandName, args, context, conditions) {
    if (conditions.denyFileOutput && context.hasFileOutput) {
        return true;
    }
    if (conditions.allowNullRedirect && context.hasRedirectToNull) {
        return false;
    }

    if (conditions.maxLines) {
        const lineCount = extractLineCount(args);
        if (lineCount !== null && lineCount <= conditions.maxLines) {
            return false;
        }
    }

    if (conditions.allowFollow && args.includes('-f')) {
        return false;
    }

    return true;
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

module.exports = { loadRules, matchRule };
