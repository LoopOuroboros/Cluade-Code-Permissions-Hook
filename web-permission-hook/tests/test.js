#!/usr/bin/env node

/**
 * Web Permission Hook 测试套件
 */

const { handleHook } = require('../scripts/check-command.js');

// 测试用例
const testCases = [
    {
        name: "WebFetch 拦截",
        input: {
            tool_name: "WebFetch",
            tool_input: {
                url: "https://example.com"
            }
        },
        expected: {
            decision: "block",
            reason: "⚠️ WebFetch 工具被拦截，使用 Fetch MCP 来代替"
        }
    },
    {
        name: "WebSearch 拦截",
        input: {
            tool_name: "WebSearch",
            tool_input: {
                query: "test"
            }
        },
        expected: {
            decision: "block",
            reason: "⚠️ WebSearch 工具被拦截，使用 Search MCP 来代替"
        }
    },
    {
        name: "其他工具放行",
        input: {
            tool_name: "Read",
            tool_input: {
                file_path: "/path/to/file.txt"
            }
        },
        expected: {
            decision: "approve"
        }
    },
    {
        name: "Write 工具放行",
        input: {
            tool_name: "Write",
            tool_input: {
                file_path: "/path/to/file.txt",
                content: "test"
            }
        },
        expected: {
            decision: "approve"
        }
    },
    {
        name: "空工具名称放行",
        input: {
            tool_name: "",
            tool_input: {}
        },
        expected: {
            decision: "approve"
        }
    }
];

// 运行测试
console.log("=" .repeat(60));
console.log("🧪 Web Permission Hook 测试套件");
console.log("=" .repeat(60));
console.log("");

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
    console.log(`测试 ${index + 1}: ${testCase.name}`);
    console.log(`   输入: ${JSON.stringify(testCase.input)}`);

    const result = handleHook(testCase.input);

    // 检查决策是否匹配
    if (result.decision === testCase.expected.decision) {
        // 如果期望拦截，检查reason是否包含关键词
        if (testCase.expected.decision === "block") {
            if (result.reason) {
                console.log(`   ✅ 通过 - decision: ${result.decision}`);
                console.log(`   提示信息: ${result.reason}`);
                passed++;
            } else {
                console.log(`   ❌ 失败 - 期望有提示信息但未返回`);
                console.log(`   实际: ${JSON.stringify(result)}`);
                failed++;
            }
        } else {
            console.log(`   ✅ 通过 -decision: ${result.decision}`);
            passed++;
        }
    } else {
        console.log(`   ❌ 失败`);
        console.log(`   期望: decision: ${testCase.expected.decision}`);
        if (testCase.expected.reason) {
            console.log(`   期望提示: ${testCase.expected.reason}`);
        }
        console.log(`   实际: decision: ${result.decision}`);
        if (result.reason) {
            console.log(`   实际提示: ${result.reason}`);
        }
        failed++;
    }

    console.log("");
});

console.log("=" .repeat(60));
console.log(`📊 测试结果: ${passed} 通过, ${failed} 失败`);
console.log("=" .repeat(60));

// 退出码
process.exit(failed > 0 ? 1 : 0);