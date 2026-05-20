// SessionStart hook — 将任务清单规则注入 Claude 上下文
// stdout 文本会自动追加到 Claude 的上下文中

const rules = `## Task List Rules — enforced by task-list-hook
1. Plan execution → TaskCreate for each step
2. Max 3 tasks InProgress at any time
3. Task complete → TaskUpdate status="completed" immediately
4. All tasks done → verify none left incomplete
5. After plan → TaskList to confirm all "completed"
6. Then → TaskUpdate all to "deleted" (clean up task list)`;

process.stdout.write(rules);
