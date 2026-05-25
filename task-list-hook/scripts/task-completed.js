// TaskCompleted hook — 确定性 JSON 输出，不阻塞任务完成
// stdout: {"ok": true} — 允许完成
// stderr: 提醒 — 展示给用户

process.stdout.write(JSON.stringify({ ok: true }));

process.stderr.write(
  '[task-list-hook] Task completed. Remember:\n' +
  '  (1) TaskList — check remaining tasks\n' +
  '  (2) All done: TaskList confirm → TaskUpdate delete all\n'
);
