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

    // Git 命令特殊处理 - 优先于通用规则
    if (commandName === 'git') {
        return handleGitCommand(context);
    }

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
        // WSL环境下且规则允许时，跳过拦截
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

function handleGitCommand(context) {
    const args = context.args || [];
    const subcommand = args[0];

    // Git 操作类命令列表 - 需要用户确认
    const ACTION_COMMANDS = [
        'commit', 'push', 'pull', 'merge', 'rebase', 'checkout',
        'reset', 'restore', 'clean', 'stash', 'apply', 'pop',
        'drop', 'branch', 'tag', 'fetch', 'cherry-pick',
        'revert', 'am', 'bisect', 'worktree', 'submodule', 'filter-branch'
    ];

    if (!subcommand) {
        // 无参数的 git 命令，放行
        return { decision: 'allow' };
    }

    // 检查是否是只读命令（需要检查参数）
    if (isGitReadonlyCommand(subcommand, args)) {
        return { decision: 'allow' };
    }

    // 检查是否是操作类命令
    if (ACTION_COMMANDS.includes(subcommand)) {
        return {
            decision: 'ask',
            message: `⚠️ git ${subcommand}命令需要确认：禁止擅自执行Git操作类命令，必须征得用户同意`,
            commandName: `git ${subcommand}`
        };
    }

    // 未知的 git 子命令，默认放行（避免阻塞有用的命令）
    return { decision: 'allow' };
}

function isGitReadonlyCommand(subcommand, args) {
    // 明确的只读命令
    const READONLY_PURE = [
        'status', 'log', 'show', 'rev-parse', 'describe',
        'ls-files', 'ls-tree', 'ls-remote', 'help', 'version', 'shortlog'
    ];

    if (READONLY_PURE.includes(subcommand)) {
        return true;
    }

    // 需要检查参数的命令
    if (subcommand === 'diff') {
        // git diff 默认是只读的
        return true;
    }

    if (subcommand === 'branch') {
        // 只有 -d/-D/-m/-c 等是操作类，无参数或 -a/-v 是只读
        const hasDangerousFlag = args.some(arg =>
            arg === '-d' || arg === '-D' || arg === '--delete' ||
            arg === '-m' || arg === '--move' ||
            arg === '-c' || arg === '--copy'
        );
        return !hasDangerousFlag;
    }

    if (subcommand === 'tag') {
        // 只有 -d/-D 是操作类
        const hasDeleteFlag = args.some(arg => arg === '-d' || arg === '-D' || arg === '--delete');
        return !hasDeleteFlag;
    }

    if (subcommand === 'config') {
        // --global --add/--unset 是操作类，--list/--get 是只读
        const hasWriteFlag = args.some(arg =>
            arg === '--add' || arg === '--unset' || arg === '--unset-all' ||
            arg === '--replace-all' || arg === '--edit'
        );
        return !hasWriteFlag;
    }

    if (subcommand === 'remote') {
        // add/rename/remove/set-url 是操作类，show 是只读
        const hasAction = args.length > 1 && ['add', 'rename', 'remove', 'set-url', 'prune'].includes(args[1]);
        return !hasAction;
    }

    if (subcommand === 'stash') {
        // list/show 是只读，pop/apply/drop/save 是操作类
        const stashAction = args[1] || 'list'; // 默认是 list
        return ['list', 'show'].includes(stashAction);
    }

    if (subcommand === 'fetch') {
        // 普通 fetch 相对安全，--prune 是操作类
        return !args.includes('--prune') && !args.includes('-p');
    }

    return false;
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
