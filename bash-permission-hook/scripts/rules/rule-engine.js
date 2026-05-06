/**
 * 规则引擎 - 定义和执行拦截规则
 */

const fs = require('fs');
const path = require('path');

let configCache = null;

function loadConfig() {
    if (configCache) {
        return configCache;
    }

    try {
        const configPath = path.join(__dirname, '../../config/config.json');
        configCache = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return configCache;
    } catch (error) {
        configCache = { rules: [], specialCommands: {}, gitClassification: null, wrapperCommands: {} };
        return configCache;
    }
}

function loadRules() {
    const config = loadConfig();
    return config.rules || [];
}

function loadWrapperConfig() {
    const config = loadConfig();
    return config.wrapperCommands || {};
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

function matchSpecialCommand(commandName, args, context) {
    const config = loadConfig();
    const specialCommands = config.specialCommands || {};
    const spec = specialCommands[commandName];
    if (!spec) return null;

    // 管道发送端放行
    if (spec.allowInPipeSender && context.isPipeSender) {
        return { decision: 'allow' };
    }
    // 管道接收端放行
    if (spec.allowInPipeReceiver && context.isPipeReceiver) {
        return { decision: 'allow' };
    }
    // WSL环境放行
    if (spec.allowInWsl && context.fromWsl) {
        return { decision: 'allow' };
    }

    // 条件匹配
    const conditions = spec.conditions || {};
    if (conditions.denyFileOutput && context.hasFileOutput) {
        return {
            decision: spec.decision || 'deny',
            message: `⚠️ ${commandName}命令被拦截，${spec.message}`,
            commandName
        };
    }
    if (conditions.allowNullRedirect && context.hasRedirectToNull) {
        return { decision: 'allow' };
    }
    if (conditions.allowFollow && args.includes('-f')) {
        return { decision: 'allow' };
    }
    if (conditions.maxLines) {
        const lineCount = extractLineCount(args);
        if (lineCount !== null && lineCount <= conditions.maxLines) {
            return { decision: 'allow' };
        }
    }

    // 有 fileOutput 条件，但没有命中 → 放行（echo 无重定向的场景）
    if (conditions.denyFileOutput && !context.hasFileOutput) {
        return { decision: 'allow' };
    }

    // 有 maxLines 条件但无法解析行数 → 走默认决策
    if (conditions.maxLines) {
        return {
            decision: spec.decision || 'deny',
            message: `⚠️ ${commandName}命令被拦截，${spec.message}`,
            commandName
        };
    }

    // 无条件限制 → 直接按 decision 拦截
    if (Object.keys(conditions).length === 0) {
        return {
            decision: spec.decision || 'deny',
            message: `⚠️ ${commandName}命令被拦截，${spec.message}`,
            commandName
        };
    }

    return { decision: 'allow' };
}

function handleGitCommand(context) {
    const config = loadConfig();
    const gitConfig = config.gitClassification;
    if (!gitConfig) return null;

    const args = context.args || [];
    const subcommand = args[0];

    if (!subcommand) {
        return { decision: 'allow' };
    }

    // 只读命令直接放行
    if (gitConfig.readonlyCommands && gitConfig.readonlyCommands.includes(subcommand)) {
        return { decision: 'allow' };
    }

    // 操作类命令 → ask
    if (gitConfig.actionCommands && gitConfig.actionCommands.commands.includes(subcommand)) {
        return {
            decision: gitConfig.actionCommands.decision,
            message: `⚠️ git ${subcommand}命令需要确认：${gitConfig.actionCommands.message}`,
            commandName: `git ${subcommand}`
        };
    }

    // 条件命令
    if (gitConfig.conditionalCommands) {
        const condConfig = gitConfig.conditionalCommands[subcommand];
        if (condConfig) {
            return evaluateGitConditional(subcommand, args, condConfig);
        }
    }

    return { decision: 'allow' };
}

function evaluateGitConditional(subcommand, args, condConfig) {
    // 检查危险 flags
    if (condConfig.dangerousFlags) {
        const hasDangerousFlag = args.some(arg => condConfig.dangerousFlags.includes(arg));
        if (hasDangerousFlag) {
            return {
                decision: condConfig.decision,
                message: `⚠️ git ${subcommand}命令需要确认：${condConfig.message}`,
                commandName: `git ${subcommand}`
            };
        }
    }

    // 检查危险 subcommands（如 remote add/remove）
    if (condConfig.dangerousSubcommands && args.length > 1) {
        const hasDangerousSubcommand = condConfig.dangerousSubcommands.includes(args[1]);
        if (hasDangerousSubcommand) {
            return {
                decision: condConfig.decision,
                message: `⚠️ git ${subcommand}命令需要确认：${condConfig.message}`,
                commandName: `git ${subcommand}`
            };
        }
    }

    // 检查只读 subcommands
    if (condConfig.readonlySubcommands && args.length > 1) {
        if (condConfig.readonlySubcommands.includes(args[1])) {
            return { decision: 'allow' };
        }
    }

    // 有 readonlySubcommands 但未命中 → 按默认 decision
    if (condConfig.readonlySubcommands) {
        return {
            decision: condConfig.decision,
            message: `⚠️ git ${subcommand}命令需要确认：${condConfig.message}`,
            commandName: `git ${subcommand}`
        };
    }

    // 无危险标志 → 默认放行
    return { decision: 'allow' };
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

module.exports = { loadConfig, loadRules, loadWrapperConfig, matchRule, matchSpecialCommand, handleGitCommand };
