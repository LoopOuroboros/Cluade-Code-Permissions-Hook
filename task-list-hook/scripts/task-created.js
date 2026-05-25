// TaskCreated hook — 确定性 JSON 输出，不阻塞任务创建
// stdout: {"ok": true} — 允许创建
// stderr: 提醒 — 展示给用户

process.stdout.write(JSON.stringify({ ok: true }));

process.stderr.write(
  '[task-list-hook] Task created. Remember:\n' +
  '  (1) Max 3 tasks InProgress simultaneously\n' +
  '  (2) TaskUpdate — track status changes\n' +
  '  (3) All done: TaskList verify → TaskUpdate delete all\n'
);
