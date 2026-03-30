/**
 * 命令解析器 - 将 token 序列转换为命令语法树
 */

const { tokenize } = require('./token-lexer');

function parse(command) {
    const tokens = tokenize(command);
    return parseSequence(tokens, 0).node;
}

function parseSequence(tokens, pos) {
    const nodes = [];

    while (pos < tokens.length) {
        const result = parseAndOr(tokens, pos);
        nodes.push(result.node);
        pos = result.pos;

        if (pos < tokens.length && tokens[pos].type === 'semicolon') {
            pos++;
        } else {
            break;
        }
    }

    if (nodes.length === 1) {
        return { node: nodes[0], pos };
    }

    return {
        node: { type: 'sequence', children: nodes },
        pos
    };
}

function parseAndOr(tokens, pos) {
    let left = parsePipeline(tokens, pos);
    pos = left.pos;

    while (pos < tokens.length) {
        const token = tokens[pos];
        if (token.type !== 'and' && token.type !== 'or') {
            break;
        }

        pos++;
        const right = parsePipeline(tokens, pos);
        pos = right.pos;

        left = {
            node: {
                type: token.type === 'and' ? 'and' : 'or',
                children: [left.node, right.node]
            },
            pos
        };
    }

    return left;
}

function parsePipeline(tokens, pos) {
    const commands = [];
    const cmdResult = parseCommand(tokens, pos);
    commands.push(cmdResult.node);
    pos = cmdResult.pos;

    while (pos < tokens.length && tokens[pos].type === 'pipe') {
        pos++;
        const nextCmd = parseCommand(tokens, pos);
        commands.push(nextCmd.node);
        pos = nextCmd.pos;
    }

    if (commands.length === 1) {
        return { node: commands[0], pos };
    }

    return {
        node: { type: 'pipeline', children: commands },
        pos
    };
}

function parseCommand(tokens, pos) {
    const args = [];
    const redirects = [];

    while (pos < tokens.length) {
        const token = tokens[pos];

        if (token.type !== 'word') {
            if (token.type === 'redirect_out' || token.type === 'redirect_append' || token.type === 'redirect_in') {
                if (pos + 1 < tokens.length && tokens[pos + 1].type === 'word') {
                    redirects.push({
                        type: token.type === 'redirect_out' ? 'out' : token.type === 'redirect_append' ? 'append' : 'in',
                        target: tokens[pos + 1].value
                    });
                    pos += 2;
                    continue;
                }
            }
            break;
        }

        args.push(token.value);
        pos++;
    }

    return {
        node: {
            type: 'command',
            command: args[0] || '',
            args: args.slice(1),
            redirects: redirects
        },
        pos
    };
}

module.exports = { parse };
