/**
 * 词法分析器 - 将命令字符串分解为 token 序列
 * 处理引号、转义字符、特殊符号
 */

/**
 * Token 类型定义
 * @typedef {Object} Token
 * @property {string} type - Token 类型: 'word', 'pipe', 'and', 'or', 'redirect_out', 'redirect_append', 'redirect_in', 'semicolon', 'quote'
 * @property {string} value - Token 内容
 * @property {number} start - 起始位置
 * @property {number} end - 结束位置
 */

/**
 * 词法分析主函数
 * @param {string} command - 完整命令字符串
 * @returns {Token[]} Token 序列
 */
function tokenize(command) {
    const tokens = [];
    let pos = 0;
    const len = command.length;

    while (pos < len) {
        const char = command[pos];

        if (/\s/.test(char)) {
            pos++;
            continue;
        }

        if (char === '"' || char === "'") {
            const token = parseQuotedString(command, pos);
            tokens.push(token);
            pos = token.end;
            continue;
        }

        if (char === '|') {
            if (pos + 1 < len && command[pos + 1] === '|') {
                tokens.push({ type: 'or', value: '||', start: pos, end: pos + 2 });
                pos += 2;
            } else {
                tokens.push({ type: 'pipe', value: '|', start: pos, end: pos + 1 });
                pos += 1;
            }
            continue;
        }

        if (char === '&' && pos + 1 < len && command[pos + 1] === '&') {
            tokens.push({ type: 'and', value: '&&', start: pos, end: pos + 2 });
            pos += 2;
            continue;
        }

        if (char === '>') {
            if (pos + 1 < len && command[pos + 1] === '>') {
                tokens.push({ type: 'redirect_append', value: '>>', start: pos, end: pos + 2 });
                pos += 2;
            } else {
                tokens.push({ type: 'redirect_out', value: '>', start: pos, end: pos + 1 });
                pos += 1;
            }
            continue;
        }

        if (char === '<') {
            tokens.push({ type: 'redirect_in', value: '<', start: pos, end: pos + 1 });
            pos += 1;
            continue;
        }

        if (char === ';') {
            tokens.push({ type: 'semicolon', value: ';', start: pos, end: pos + 1 });
            pos += 1;
            continue;
        }

        const token = parseWord(command, pos);
        tokens.push(token);
        pos = token.end;
    }

    return tokens;
}

function parseQuotedString(command, startPos) {
    const quoteChar = command[startPos];
    let pos = startPos + 1;
    let value = '';

    while (pos < command.length) {
        const char = command[pos];
        if (char === quoteChar) {
            pos++;
            break;
        }
        if (char === '\\' && pos + 1 < command.length) {
            value += command[pos + 1];
            pos += 2;
        } else {
            value += char;
            pos++;
        }
    }

    return {
        type: 'word',
        value: value,
        start: startPos,
        end: pos,
        quoted: true
    };
}

function parseWord(command, startPos) {
    let pos = startPos;
    let value = '';

    while (pos < command.length) {
        const char = command[pos];
        if (/\s|[\|\&;\<\>]/.test(char)) {
            break;
        }
        value += char;
        pos++;
    }

    return {
        type: 'word',
        value: value,
        start: startPos,
        end: pos
    };
}

module.exports = { tokenize };
