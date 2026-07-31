/**
 * 合并任务进度。解析完成时服务端会把 progress 设为 1.0，
 * 开始下载时又重置为约 0.05；若前端只用 Math.max，进度条会卡在 100%。
 */
export function mergeJobProgress(
  prev: number,
  next: number,
  status: string
): number {
  // 仅在「解析已满格 → 新下载起步」时允许回退，避免下载过程中的小幅回退干扰
  if (status === "downloading" && next <= 0.1 && prev >= 0.9) {
    return next;
  }
  return Math.max(prev, next);
}
