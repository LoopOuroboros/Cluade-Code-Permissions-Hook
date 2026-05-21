#!/usr/bin/env node

/**
 * prompt-restatement-hook — 用户意图确认插件
 *
 * 在 UserPromptSubmit 事件触发时运行，向 LLM 上下文注入复述确认指令。
 * 要求 LLM 在执行用户请求前先用自己的话复述请求，并通过 AskUserQuestion
 * 工具确认理解正确。
 *
 * @version 1.0.0
 */

'use strict';

/**
 * 对用户输入做基本清理：移除控制字符
 * @param {string} text
 * @returns {string}
 */
function sanitize(text) {
  return (text || '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim();
}

/**
 * 判断用户输入是否仅为斜杠命令（如 /clear、/plugin、/ouroboros:git-commit）
 * 斜杠命令不需要复述确认，直接放行
 * @param {string} text - 用户输入
 * @returns {boolean}
 */
function isSlashCommandOnly(text) {
  return /^\s*\/[a-zA-Z][\w:.-]*(\s+.*)?$/.test(text);
}

/**
 * 构建复述确认指令文本
 * @param {string} userPrompt - 用户原始请求
 * @returns {string} 注入到 LLM 上下文的指令，空字符串表示不注入
 */
function buildRestatementInstruction(userPrompt) {
  const sanitized = sanitize(userPrompt);
  const isSlash = isSlashCommandOnly(sanitized);
  process.stderr.write(`[prompt-restatement-hook] raw="${userPrompt}" sanitized="${sanitized}" isSlash=${isSlash}\n`);

  if (!sanitized) {
    process.stderr.write('[prompt-restatement-hook] empty prompt, skip\n');
    return '';
  }

  // 斜杠命令直接放行，无需复述确认
  if (isSlash) {
    process.stderr.write('[prompt-restatement-hook] slash command, skip\n');
    return '';
  }

  return [
    '## 用户意图确认（prompt-restatement-hook 插件）',
    '',
    '在正式开始回答之前，你必须严格执行以下确认流程：',
    '',
    '**第一步 - 调用 AskUserQuestion 并嵌入复述**：直接调用 `AskUserQuestion` 工具，在问题文本中先写出你对用户请求的复述，然后询问是否正确。',
    '',
    '问题文本格式示例：',
    '> "我的理解是：[在此用你自己的话复述用户请求]',
    '>',
    '> 以上理解是否正确？"',
    '',
    '**注意**：不要在调用 AskUserQuestion 之前单独输出复述文字——复述内容必须嵌入到 AskUserQuestion 的问题文本内部，确保用户能在确认界面中直接看到。',
    '',
    '**第二步 - 等待用户确认**：在用户通过 `AskUserQuestion` 明确确认之前，不得进行实质性操作，也不得给出最终答案。',
    '',
    '**第三步 - 迭代修正**：如果用户指出你的理解有偏差，根据用户的反馈修正你的复述，然后再次调用 `AskUserQuestion` 请求确认。重复此过程直到用户明确表示理解正确为止。',
    '',
    '**第四步 - 继续执行**：仅在用户明确确认后，才能开始执行用户的原始请求。',
    '',
    '--- 用户请求原文 ---',
    sanitized,
    '---',
    '',
    '**再次强调**：上述确认流程是强制性的，必须先完成才能执行请求。'
  ].join('\n');
}

/**
 * 主处理函数
 * @param {Object} input - Claude Code 传入的 JSON 输入
 * @returns {Object} 输出到 stdout 的 JSON 响应
 */
function handleHook(input) {
  try {
    const userPrompt = input && input.prompt;
    const instruction = buildRestatementInstruction(userPrompt);

    return {
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: instruction
      }
    };
  } catch (error) {
    console.error('[prompt-restatement-hook] Error:', error.message);
    return {
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: ''
      }
    };
  }
}

// 主入口：从 stdin 同步读取 JSON 输入
const fs = require('fs');
const stdin = fs.readFileSync(0, 'utf8');
const input = JSON.parse(stdin);
const output = handleHook(input);
process.stdout.write(JSON.stringify(output));
