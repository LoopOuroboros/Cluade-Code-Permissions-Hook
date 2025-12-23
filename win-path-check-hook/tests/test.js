/**
 * win-path-check-hook 插件测试套件
 * 测试Windows路径自动修正功能
 */

const { checkWindowsPath } = require('../scripts/check-path.js');

console.log('=== win-path-check-hook 测试套件 ===\n');

// 测试用例
const tests = [
    {
        name: '测试1: Windows绝对路径自动修正',
        input: { tool_input: { command: 'cat C:\\Users\\test\\file.txt' } },
        expected: { permissionDecision: 'allow', fixedCommand: 'cat C:/Users/test/file.txt' },
        category: '自动修正测试'
    },
    {
        name: '测试2: 相对路径自动修正',
        input: { tool_input: { command: 'ls folder\\subfolder\\file.txt' } },
        expected: { permissionDecision: 'allow', fixedCommand: 'ls folder/subfolder/file.txt' },
        category: '自动修正测试'
    },
    {
        name: '测试3: 包含空格的路径修正',
        input: { tool_input: { command: 'cd "C:\\Program Files\\app\\"' } },
        expected: { permissionDecision: 'allow', fixedCommand: 'cd "C:/Program Files/app/"' },
        category: '自动修正测试'
    },
    {
        name: '测试4: 用户目录路径修正',
        input: { tool_input: { command: 'cat ~\\Documents\\note.txt' } },
        expected: { permissionDecision: 'allow', fixedCommand: 'cat ~/Documents/note.txt' },
        category: '自动修正测试'
    },
    {
        name: '测试5: 混合路径场景修正',
        input: { tool_input: { command: 'find . -name "*.txt" -path C:\\Data\\logs\\' } },
        expected: { permissionDecision: 'allow', fixedCommand: 'find . -name "*.txt" -path C:/Data/logs/' },
        category: '自动修正测试'
    },
    {
        name: '测试6: 安全命令（无反斜杠）直接放行',
        input: { tool_input: { command: 'echo hello world' } },
        expected: { decision: 'approve' },
        category: '放行测试'
    },
    {
        name: '测试7: 空命令处理',
        input: { tool_input: { command: '' } },
        expected: { decision: 'approve' },
        category: '放行测试'
    },
    {
        name: '测试8: 简单命令放行',
        input: { tool_input: { command: 'pwd' } },
        expected: { decision: 'approve' },
        category: '放行测试'
    },
    {
        name: '测试9: 正斜杠路径正确格式',
        input: { tool_input: { command: 'cat C:/Users/test/file.txt' } },
        expected: { decision: 'approve' },
        category: '放行测试'
    },
    {
        name: '测试10: 无tool_input对象',
        input: {},
        expected: { decision: 'approve' },
        category: '边界测试'
    },
    {
        name: '测试11: null command处理',
        input: { tool_input: { command: null } },
        expected: { decision: 'approve' },
        category: '边界测试'
    },
    {
        name: '测试12: 单个反斜杠末尾',
        input: { tool_input: { command: 'cd C:\\Users\\test\\' } },
        expected: { permissionDecision: 'allow', fixedCommand: 'cd C:/Users/test/' },
        category: '自动修正测试'
    }
];

// 运行测试
let totalTests = tests.length;
let passedTests = 0;
let failedTests = 0;
const results = { '自动修正测试': { pass: 0, fail: 0 }, '放行测试': { pass: 0, fail: 0 }, '边界测试': { pass: 0, fail: 0 } };

console.log('开始执行测试用例...\n');

tests.forEach((test, index) => {
    try {
        const startTime = Date.now();
        const result = checkWindowsPath(test.input);
        const executionTime = Date.now() - startTime;

        // 检查期望结果
        let success = false;
        if (test.expected.permissionDecision === 'allow') {
            success = result.hookSpecificOutput?.permissionDecision === 'allow' &&
                      result.hookSpecificOutput?.updatedInput?.command === test.expected.fixedCommand;
        } else {
            success = result.decision === test.expected.decision;
        }

        results[test.category][success ? 'pass' : 'fail']++;

        if (success) {
            passedTests++;
            console.log(`✅ ${test.name}`);
            console.log(`   执行时间: ${executionTime}ms`);

            // 对于自动修正测试，显示修正效果
            if (test.expected.permissionDecision === 'allow') {
                console.log(`   🔄 自动修正: ${test.input.tool_input?.command} → ${result.hookSpecificOutput?.updatedInput?.command}`);
            }
        } else {
            failedTests++;
            console.log(`❌ ${test.name}`);
            console.log(`   期望: ${JSON.stringify(test.expected)}, 实际: ${JSON.stringify(result)}`);
            console.log(`   执行时间: ${executionTime}ms`);
        }
        console.log('');
    } catch (error) {
        failedTests++;
        results[test.category].fail++;
        console.log(`❌ ${test.name} - 执行错误:`);
        console.log(`   错误信息: ${error.message}`);
        console.log(`   堆栈: ${error.stack}`);
        console.log('');
    }
});

// 格式化测试结果
console.log('=== 测试结果统计 ===');
console.log(`总测试数: ${totalTests}`);
console.log(`✅ 通过: ${passedTests}`);
console.log(`❌ 失败: ${failedTests}`);
console.log(`📊 通过率: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

console.log('=== 分类统计 ===');
Object.entries(results).forEach(([category, result]) => {
    const total = result.pass + result.fail;
    const passRate = total > 0 ? ((result.pass / total) * 100).toFixed(1) : 0;
    console.log(`${category}:`, `✅${result.pass}/${total}`, `(${passRate}%)`);
});

// 性能测试
console.log('\n=== 性能测试 ===');
const performanceTest = () => {
    const testCommand = { tool_input: { command: 'cat C:\\Users\\test\\file.txt' } };
    const iterations = 1000;
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
        checkWindowsPath(testCommand);
    }

    const totalTime = Date.now() - startTime;
    const avgTime = totalTime / iterations;

    console.log(`处理 ${iterations} 次请求耗时: ${totalTime}ms`);
    console.log(`平均单次处理时间: ${avgTime.toFixed(2)}ms`);
    console.log(`每秒处理能力: ${(1000 / avgTime).toFixed(0)} req/s`);
};

performanceTest();

// 功能演示
console.log('\n=== 功能演示 ===');
console.log('演示场景1: Windows绝对路径自动修正');
const demo1 = checkWindowsPath({ tool_input: { command: 'cat C:\\Users\\admin\\data.txt' } });
console.log('原始命令: cat C:\\Users\\admin\\data.txt');
console.log('修正为:', demo1.hookSpecificOutput?.updatedInput?.command);
console.log('修正说明:', demo1.hookSpecificOutput?.permissionDecisionReason);

console.log('\n演示场景2: 包含引号和空格的路径');
const demo2 = checkWindowsPath({ tool_input: { command: 'ls "C:\\Program Files\\MyApp\\logs\\"' } });
console.log('原始命令: ls "C:\\Program Files\\MyApp\\logs\\"');
console.log('修正为:', demo2.hookSpecificOutput?.updatedInput?.command);

// 最终结论
console.log('\n=== 测试结论 ===');
if (failedTests === 0) {
    console.log('🎉 所有测试通过！插件功能正常，性能表现良好。');
    console.log('✅ 插件已准备就绪，可进行部署安装。');
    console.log('🔄 支持自动路径修正功能，用户体验大幅提升。');
    process.exit(0);
} else {
    console.log('⚠️ 部分测试失败，请检查以下问题:');
    console.log('1. 路径自动修正逻辑的正确性');
    console.log('2. 边界条件处理的完整性');
    console.log('3. 输入参数验证的健壮性');
    console.log('\n建议在部署前修复所有失败的测试用例。');
    process.exit(1);
}