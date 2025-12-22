#!/usr/bin/env node

/**
 * 测试脚本
 * 验证命令拆分和权限检查逻辑
 */

const {
    splitCommands,
    splitCommandsWithSplits,
    isInPipeReceiver,
    checkCommand,
    handleHook
} = require('../scripts/check-command.js');

// 加载规则用于测试
const rules = [
    { pattern: "find", action: "reject", suggestion: "使用内置的Glob工具代替" },
    { pattern: "grep", action: "reject", suggestion: "使用内置的Grep工具代替", allowInPipeReceiver: true },
    { pattern: "cat", action: "reject", suggestion: "使用内置的Read工具代替" },
    { pattern: "head", action: "reject", suggestion: "使用内置的Read工具代替", allowInPipeReceiver: true },
    { pattern: "npm install", action: "reject", suggestion: "请手动在终端中执行npm install" }
];

/**
 * 测试命令拆分功能
 */
function testCommandSplitting() {
    console.log('\n=== 测试命令拆分功能 ===\n');

    const testCases = [
        {
            name: '单个命令',
            input: 'find .',
            expected: ['find .']
        },
        {
            name: '双命令 &&',
            input: 'find . && ls',
            expected: ['find .', 'ls']
        },
        {
            name: '双命令 |',
            input: 'cat file.txt | grep test',
            expected: ['cat file.txt', 'grep test']
        },
        {
            name: '多操作符',
            input: 'cmd1 || cmd2 && cmd3',
            expected: ['cmd1', 'cmd2', 'cmd3']
        },
        {
            name: '管道和逻辑与',
            input: 'find . -name *.git | grep test && echo found',
            expected: ['find . -name *.git', 'grep test', 'echo found']
        },
        {
            name: '带路径的命令',
            input: '/usr/bin/find .',
            expected: ['/usr/bin/find .']
        }
    ];

    let passed = 0;
    let failed = 0;

    testCases.forEach(({ name, input, expected }) => {
        const result = splitCommands(input);
        const isMatch = JSON.stringify(result) === JSON.stringify(expected);

        if (isMatch) {
            console.log(`✓ ${name}: 通过`);
            console.log(`  输入: "${input}"`);
            console.log(`  输出: ${JSON.stringify(result)}`);
            passed++;
        } else {
            console.log(`✗ ${name}: 失败`);
            console.log(`  输入: "${input}"`);
            console.log(`  期望: ${JSON.stringify(expected)}`);
            console.log(`  实际: ${JSON.stringify(result)}`);
            failed++;
        }
        console.log();
    });

    console.log(`\n拆分测试结果: ${passed} 通过, ${failed} 失败\n`);
    return failed === 0;
}

/**
 * 测试前缀匹配功能
 */
function testPrefixMatching() {
    console.log('\n=== 测试前缀匹配功能 ===\n');

    const testCases = [
        {
            name: '基础命令',
            input: 'find .',
            expectedBlocked: true
        },
        {
            name: '带路径的命令',
            input: '/usr/bin/find .',
            expectedBlocked: true
        },
        {
            name: '子命令',
            input: 'npm install express',
            expectedBlocked: true
        },
        {
            name: '带选项的命令',
            input: 'grep "test" file.txt',
            expectedBlocked: true
        },
        {
            name: '允许的命令',
            input: 'echo hello',
            expectedBlocked: false
        },
        {
            name: '允许的命令2',
            input: 'npm run build',
            expectedBlocked: false
        }
    ];

    let passed = 0;
    let failed = 0;

    testCases.forEach(({ name, input, expectedBlocked }) => {
        const result = checkCommand(input, rules);
        const isMatch = result.isBlocked === expectedBlocked;

        if (isMatch) {
            console.log(`✓ ${name}: 通过`);
            console.log(`  命令: "${input}"`);
            console.log(`  状态: ${result.isBlocked ? '已拦截' : '已放行'}`);
            if (result.message) {
                console.log(`  消息: ${result.message}`);
            }
            passed++;
        } else {
            console.log(`✗ ${name}: 失败`);
            console.log(`  命令: "${input}"`);
            console.log(`  期望: ${expectedBlocked ? '拦截' : '放行'}`);
            console.log(`  实际: ${result.isBlocked ? '拦截' : '放行'}`);
            if (result.message) {
                console.log(`  消息: ${result.message}`);
            }
            failed++;
        }
        console.log();
    });

    console.log(`\n匹配测试结果: ${passed} 通过, ${failed} 失败\n`);
    return failed === 0;
}

/**
 * 测试管道位置检测功能
 */
function testPipeReceiverDetection() {
    console.log('\n=== 测试管道位置检测功能 ===\n');

    const testCases = [
        {
            name: 'grep在管道接收端位置',
            command: 'find . -name "*.js" | grep test',
            grepIndex: 1,
            expectedReceiver: true
        },
        {
            name: '简单管道',
            command: 'cat file.txt | grep pattern',
            grepIndex: 1,
            expectedReceiver: true
        },
        {
            name: 'head在管道接收端位置',
            command: 'cat file.txt | head -10',
            headIndex: 1,
            expectedReceiver: true
        },
        {
            name: '多个管道中的grep',
            command: 'cmd1 | grep a | grep b',
            grepIndices: [1, 2],
            expectedReceivers: [true, true]
        },
        {
            name: '混合操作符',
            command: 'find . | grep test && grep other file',
            grepIndex: 1,
            expectedReceiver: true
        },
        {
            name: '单独grep',
            command: 'grep test file.txt',
            grepIndex: 0,
            expectedReceiver: false
        },
        {
            name: 'grep作为管道发送端',
            command: 'grep pattern file.txt | wc -l',
            grepIndex: 0,
            expectedReceiver: false
        },
        {
            name: 'head作为管道发送端',
            command: 'head -10 file.txt | wc -l',
            headIndex: 0,
            expectedReceiver: false
        }
    ];

    let passed = 0;
    let failed = 0;

    testCases.forEach(({ name, command, grepIndex, expectedReceiver, headIndex }) => {
        if (grepIndex === undefined && headIndex === undefined) return; // 跳过特殊测试

        const { commands, splits } = splitCommandsWithSplits(command);
        const index = grepIndex !== undefined ? grepIndex : headIndex;
        const cmdType = grepIndex !== undefined ? 'grep' : 'head';
        const isReceiver = isInPipeReceiver(commands[index], index, commands, splits);
        const isMatch = isReceiver === expectedReceiver;

        if (isMatch) {
            console.log(`✓ ${name}: 通过`);
            console.log(`  命令: "${command}"`);
            console.log(`  ${cmdType}索引: ${index}`);
            console.log(`  是否接收端: ${isReceiver}`);
            passed++;
        } else {
            console.log(`✗ ${name}: 失败`);
            console.log(`  命令: "${command}"`);
            console.log(`  ${cmdType}索引: ${index}`);
            console.log(`  期望接收端: ${expectedReceiver}`);
            console.log(`  实际接收端: ${isReceiver}`);
            failed++;
        }
        console.log();
    });

    // 测试多个grep的特殊情况
    const multiGrepCase = testCases.find(tc => tc.name === '多个管道中的grep');
    if (multiGrepCase) {
        const { commands, splits } = splitCommandsWithSplits(multiGrepCase.command);
        let allPassed = true;

        multiGrepCase.grepIndices.forEach((index, i) => {
            const isReceiver = isInPipeReceiver(commands[index], index, commands, splits);
            const expected = multiGrepCase.expectedReceivers[i];
            if (isReceiver !== expected) {
                allPassed = false;
            }
        });

        if (allPassed) {
            console.log(`✓ ${multiGrepCase.name}: 多grep通过`);
            passed++;
        } else {
            console.log(`✗ ${multiGrepCase.name}: 多grep失败`);
            failed++;
        }
    }

    console.log(`\n管道位置检测测试结果: ${passed} 通过, ${failed} 失败\n`);
    return failed === 0;
}

/**
 * 测试管道中的grep特殊处理
 */
function testPipeGrepHandling() {
    console.log('\n=== 测试管道中的grep特殊处理 ===\n');

    const testCases = [
        {
            name: 'grep在管道接收端位置但前面命令被拦截',
            command: 'find . | grep test',
            shouldBlock: true,  // find被拦截
            blockedBy: 'find'
        },
        {
            name: 'grep单独执行',
            command: 'grep test file.txt',
            shouldBlock: true,
            blockedBy: 'grep'
        },
        {
            name: '复杂管道中的多个grep',
            command: 'cat file.txt | grep test | head -5',
            shouldBlock: true,  // cat被拦截
            blockedBy: 'cat'
        },
        {
            name: '混合操作符',
            command: 'find . | grep test && grep other file',
            shouldBlock: true,  // find被拦截
            blockedBy: 'find'
        },
        {
            name: '带路径的grep在管道中但前面命令被拦截',
            command: 'find . | /usr/bin/grep test',
            shouldBlock: true,  // find被拦截
            blockedBy: 'find'
        },
        {
            name: '带选项的grep在管道中但前面命令被拦截',
            command: 'cat file.txt | grep -i "pattern"',
            shouldBlock: true,  // cat被拦截
            blockedBy: 'cat'
        },
        {
            name: '多个grep都在管道中且前面命令允许',
            command: 'cmd1 | grep a | grep b',
            shouldBlock: false
        },
        {
            name: '管道grep与允许命令组合但前面命令被拦截',
            command: 'find . | grep test && echo "found"',
            shouldBlock: true,  // find被拦截
            blockedBy: 'find'
        },
        {
            name: '允许命令+管道grep（真正的测试）',
            command: 'echo "test" | grep "test"',
            shouldBlock: false  // echo允许，grep在管道中
        },
        {
            name: '单独grep应该被拦截',
            command: '/usr/bin/grep test file.txt',
            shouldBlock: true,
            blockedBy: 'grep'
        },
        {
            name: 'head在管道中被放行',
            command: 'echo "content" | head -10',
            shouldBlock: false
        },
        {
            name: '单独head应该被拦截',
            command: 'head file.txt',
            shouldBlock: true,
            blockedBy: 'head'
        },
        {
            name: '单独的head -n 10应该被拦截',
            command: 'head -n 10 file.txt',
            shouldBlock: true,
            blockedBy: 'head'
        },
        {
            name: '管道中的head带选项应该被放行',
            command: 'echo "test" | head -5',
            shouldBlock: false
        },
        {
            name: '复杂管道中的head应该被放行',
            command: 'find . -name "*.js" | grep test | head -5',
            shouldBlock: true,  // find被拦截
            blockedBy: 'find'
        },
        {
            name: 'head作为管道发送端应该被放行但前面命令被拦截',
            command: 'cat file.txt | head -10 | wc -l',
            shouldBlock: true,  // cat被拦截
            blockedBy: 'cat'
        }
    ];

    let passed = 0;
    let failed = 0;

    testCases.forEach(({ name, command, shouldBlock, blockedBy }) => {
        // 使用模拟的input结构测试handleHook
        const mockInput = {
            tool_input: {
                command: command
            }
        };

        const result = handleHook(mockInput);
        const blocked = result.hookSpecificOutput?.permissionDecision === "deny";
        let isMatch = blocked === shouldBlock;

        // 如果期望被拦截，还需要验证拦截的命令
        if (shouldBlock && blockedBy) {
            // 从permissionDecisionReason中提取命令名
            const reasonFrom = result.hookSpecificOutput?.permissionDecisionReason
                ? result.hookSpecificOutput.permissionDecisionReason.match(/⚠️ (\w+)命令/)
                : null;
            isMatch = isMatch && reasonFrom && reasonFrom[1] === blockedBy;
        }

        if (isMatch) {
            console.log(`✓ ${name}: 通过`);
            console.log(`  命令: "${command}"`);
            console.log(`  结果: ${blocked ? '被拦截' : '已放行'}`);
            if (result.hookSpecificOutput?.permissionDecisionReason) {
                console.log(`  原因: ${result.hookSpecificOutput.permissionDecisionReason}`);
            }
            passed++;
        } else {
            console.log(`✗ ${name}: 失败`);
            console.log(`  命令: "${command}"`);
            console.log(`  期望: ${shouldBlock ? '拦截' : '放行'}`);
            console.log(`  实际: ${blocked ? '拦截' : '放行'}`);
            if (blockedBy) {
                const reasonFrom = result.hookSpecificOutput?.permissionDecisionReason
                    ? result.hookSpecificOutput.permissionDecisionReason.split(' ')[1]
                    : null;
                console.log(`  期望拦截命令: ${blockedBy}, 实际: ${reasonFrom}`);
            }
            if (result.hookSpecificOutput?.permissionDecisionReason) {
                console.log(`  原因: ${result.hookSpecificOutput.permissionDecisionReason}`);
            }
            failed++;
        }
        console.log();
    });

    console.log(`\n管道grep处理测试结果: ${passed} 通过, ${failed} 失败\n`);
    return failed === 0;
}

/**
 * 测试完整流程
 */
function testCompleteFlow() {
    console.log('\n=== 测试完整流程 ===\n');

    const testCases = [
        {
            name: '复合命令拆分拦截',
            command: 'find . -name "*.js" | grep test',
            shouldBlock: true,
            blockedCommand: 'find'
        },
        {
            name: '复合命令多个拦截点',
            command: 'cat file.txt && npm install express',
            shouldBlock: true,
            blockedCommand: 'cat'
        },
        {
            name: '全部允许的命令',
            command: 'echo hello && npm run build',
            shouldBlock: false
        }
    ];

    let passed = 0;
    let failed = 0;

    testCases.forEach(({ name, command, shouldBlock, blockedCommand }) => {
        const commands = splitCommands(command);
        let blocked = false;
        let blockedBy = null;

        for (const cmd of commands) {
            const decision = checkCommand(cmd, rules);
            if (decision.isBlocked) {
                blocked = true;
                blockedBy = cmd.trim().split(/\s+/)[0].replace(/^.*[\/\\]/, '');
                break;
            }
        }

        const isMatch = blocked === shouldBlock &&
            (!shouldBlock || blockedBy === blockedCommand);

        if (isMatch) {
            console.log(`✓ ${name}: 通过`);
            console.log(`  命令: "${command}"`);
            console.log(`  结果: ${blocked ? '被拦截' : '已放行'}`);
            if (blocked) {
                console.log(`  拦截命令: ${blockedBy}`);
            }
            passed++;
        } else {
            console.log(`✗ ${name}: 失败`);
            console.log(`  命令: "${command}"`);
            console.log(`  期望: ${shouldBlock ? '拦截' : '放行'}`);
            console.log(`  实际: ${blocked ? '拦截' : '放行'}`);
            if (blocked) {
                console.log(`  实际拦截命令: ${blockedBy}, 期望: ${blockedCommand}`);
            }
            failed++;
        }
        console.log();
    });

    console.log(`\n完整流程测试结果: ${passed} 通过, ${failed} 失败\n`);
    return failed === 0;
}

/**
 * 测试新版hookSpecificOutput格式
 */
function testNewJSONFormat() {
    console.log('\n=== 测试新版hookSpecificOutput JSON格式 ===\n');

    const testCases = [
        {
            name: '拦截命令返回hookSpecificOutput格式',
            command: 'grep "test" file.txt',
            expectedDecision: 'deny',
            shouldContain: 'hookEventName'
        },
        {
            name: '放行命令也返回hookSpecificOutput格式',
            command: 'echo hello',
            expectedDecision: 'allow',
            shouldContain: 'hookEventName'
        },
        {
            name: '包含permissionDecisionReason',
            command: 'find .',
            expectedDecision: 'deny',
            shouldContainReason: true
        }
    ];

    let passed = 0;
    let failed = 0;

    testCases.forEach(({ name, command, expectedDecision, shouldContain, shouldContainReason }) => {
        const mockInput = {
            tool_input: {
                command: command
            }
        };

        const result = handleHook(mockInput);

        const hasHookSpecificOutput = result.hasOwnProperty('hookSpecificOutput');
        const correctDecision = expectedDecision !== undefined
            ? result.hookSpecificOutput?.permissionDecision === expectedDecision
            : true;
        const hasHookEventName = result.hookSpecificOutput?.hookEventName === 'PreToolUse';
        const hasReason = shouldContainReason
            ? !!result.hookSpecificOutput?.permissionDecisionReason
            : true;

        const isMatch = hasHookSpecificOutput && correctDecision && hasHookEventName && hasReason;

        if (isMatch) {
            console.log(`✓ ${name}: 通过`);
            console.log(`  JSON结构: ${JSON.stringify(result, null, 2).substring(0, 100)}...`);
            passed++;
        } else {
            console.log(`✗ ${name}: 失败`);
            console.log(`  期望格式: 包含hookSpecificOutput.permissionDecision=${expectedDecision}`);
            console.log(`  实际: ${JSON.stringify(result)}`);
            failed++;
        }
        console.log();
    });

    console.log(`\n新版JSON格式测试结果: ${passed} 通过, ${failed} 失败\n`);
    return failed === 0;
}

/**
 * 运行所有测试
 */
function runAllTests() {
    console.log('========================================');
    console.log('  Claude Code Bash Permission Hook  ');
    console.log('           测试套件                    ');
    console.log('========================================');

    const test1 = testCommandSplitting();
    const test2 = testPrefixMatching();
    const test3 = testPipeReceiverDetection();
    const test4 = testPipeGrepHandling();
    const test5 = testCompleteFlow();
    const test6 = testNewJSONFormat();

    console.log('\n========================================');
    console.log('              测试总结                ');
    console.log('========================================\n');

    if (test1 && test2 && test3 && test4 && test5 && test6) {
        console.log('✓ 所有测试通过！');
        console.log('✓ 新版hookSpecificOutput JSON格式正确');
        process.exit(0);
    } else {
        console.log('✗ 存在失败的测试');
        process.exit(1);
    }
}

// 运行测试
runAllTests();