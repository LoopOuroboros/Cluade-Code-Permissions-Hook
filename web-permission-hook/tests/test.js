#!/usr/bin/env node

/**
 * Web Permission Hook 测试套件
 * 验证新版hookSpecificOutput JSON格式
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
            permissionDecision: "deny",
            shouldContainReason: true
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
            permissionDecision: "deny",
            shouldContainReason: true
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
            permissionDecision: "allow"
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
            permissionDecision: "allow"
        }
    },
    {
        name: "空工具名称放行",
        input: {
            tool_name: "",
            tool_input: {}
        },
        expected: {
            permissionDecision: "allow"
        }
    },
    {
        name: "验证JSON格式包含hookSpecificOutput",
        input: {
            tool_name: "WebFetch",
            tool_input: {
                url: "https://example.com"
            }
        },
        expected: {
            permissionDecision: "deny",
            shouldValidateFormat: true
        }
    }
];

// 运行测试
console.log("=" .repeat(60));
console.log("🧪 Web Permission Hook 测试套件");
console.log("验证新版 hookSpecificOutput JSON 格式");
console.log("=" .repeat(60));
console.log("");

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
    console.log(`测试 ${index + 1}: ${testCase.name}`);
    console.log(`   输入: ${JSON.stringify(testCase.input)}`);

    const result = handleHook(testCase.input);

    // 验证新的hookSpecificOutput格式
    const hasHookSpecificOutput = result.hasOwnProperty('hookSpecificOutput');
    const permissionDecision = result.hookSpecificOutput?.permissionDecision;
    const hookEventName = result.hookSpecificOutput?.hookEventName;
    const hasPermissionReason = !!result.hookSpecificOutput?.permissionDecisionReason;

    let testPassed = false;

    if (testCase.expected.shouldValidateFormat) {
        // 验证JSON格式的完整性
        testPassed = hasHookSpecificOutput &&
                     permissionDecision === testCase.expected.permissionDecision &&
                     hookEventName === 'PreToolUse';

        if (testPassed) {
            console.log(`   ✅ 通过 - JSON格式正确`);
            console.log(`   格式验证: hookSpecificOutput 存在`);
            console.log(`   permissionDecision: ${permissionDecision}`);
            console.log(`   hookEventName: ${hookEventName}`);
            if (hasPermissionReason) {
                console.log(`   提示信息: ${result.hookSpecificOutput.permissionDecisionReason}`);
            }
        }
    } else if (permissionDecision === testCase.expected.permissionDecision) {
        // 验证决策结果
        if (testCase.expected.permissionDecision === "deny" && testCase.expected.shouldContainReason) {
            if (hasPermissionReason) {
                console.log(`   ✅ 通过 - decision: ${permissionDecision}`);
                console.log(`   提示信息: ${result.hookSpecificOutput.permissionDecisionReason}`);
                testPassed = true;
            } else {
                console.log(`   ❌ 失败 - 期望有提示信息但未返回`);
                console.log(`   实际: ${JSON.stringify(result)}`);
            }
        } else {
            console.log(`   ✅ 通过 - decision: ${permissionDecision}`);
            testPassed = true;
        }
    }

    if (!testPassed && !hasHookSpecificOutput) {
        console.log(`   ❌ 失败 - 未使用新版hookSpecificOutput格式`);
        console.log(`   期望格式: hookSpecificOutput.permissionDecision`);
        console.log(`   实际结构: ${JSON.stringify(result)}`);
    } else if (!testPassed) {
        console.log(`   ❌ 失败`);
        console.log(`   期望: permissionDecision: ${testCase.expected.permissionDecision}`);
        console.log(`   实际: ${permissionDecision}`);
        if (result.hookSpecificOutput?.permissionDecisionReason) {
            console.log(`   实际提示: ${result.hookSpecificOutput.permissionDecisionReason}`);
        }
    }

    if (testPassed) {
        passed++;
    } else {
        failed++;
    }

    console.log("");
});

// 新版JSON格式验证测试
console.log("=" .repeat(60));
console.log("📋 新版 JSON 格式验证");
console.log("=" .repeat(60));

const formatTest = {
    name: "完整JSON格式验证",
    input: { tool_name: "WebFetch", tool_input: { url: "https://example.com" } },
    expectedPattern: {
        hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "deny",
            permissionDecisionReason: "should exist"
        }
    }
};

const formatResult = handleHook(formatTest.input);
const formatValid = formatResult.hookSpecificOutput &&
                    formatResult.hookSpecificOutput.hookEventName === 'PreToolUse' &&
                    formatResult.hookSpecificOutput.permissionDecision === 'deny' &&
                    !!formatResult.hookSpecificOutput.permissionDecisionReason;

if (formatValid) {
    console.log("✅ JSON格式验证通过");
    console.log("   使用的字段:");
    console.log("   - hookSpecificOutput ✓");
    console.log("   - hookEventName ✓");
    console.log("   - permissionDecision ✓");
    console.log("   - permissionDecisionReason ✓");
    console.log("");
    console.log("废弃的旧字段:");
    console.log("   - decision ✓ (已废弃)");
    console.log("   - reason ✓ (已废弃)");
    console.log("   - approve/block ✓ (已废弃)");
} else {
    console.log("❌ JSON格式验证失败");
    console.log(`   结果: ${JSON.stringify(formatResult)}`);
}

console.log("");
console.log("=" .repeat(60));
console.log(`📊 测试结果: ${passed} 通过, ${failed} 失败`);
console.log(`📋 JSON格式: ${formatValid ? '✅ 符合新标准' : '❌ 使用旧格式'}`);
console.log("=" .repeat(60));

// 退出码
const finalResult = (failed === 0 && formatValid) ? 0 : 1;
process.exit(finalResult);