// Stop hook — 确定性 JSON 输出，不阻塞会话停止
// stdout: {} — 解析为 JSON，省略 decision = 允许停止
// stderr: 清理提醒 — 展示给用户

process.stdout.write(JSON.stringify({}));

process.stderr.write(
  '[task-list-hook] Session stopping. Before next session, remember to:\n' +
  '  (1) TaskList — review all task statuses\n' +
  '  (2) TaskUpdate — mark completed tasks as "completed"\n' +
  '  (3) TaskUpdate — delete all tasks to clean up\n'
);
