"use client";

import { useState } from "react";
import MarkdownContent from "@/components/summary/MarkdownContent";
import MindMapView from "@/components/summary/MindMapView";

const SAMPLE_MD = `# 视频摘要示例

这是一段 **Markdown** 测试内容，用于验证排版。

## 核心观点

1. 第一点说明：包含 *斜体* 与 \`代码\`
2. 第二点说明：列表项应正确换行

### 细节

- 子要点 A
- 子要点 B

> 引用块：SSE 不应丢失空格与换行。

\`\`\`
code block
line 2
\`\`\`
`;

const SAMPLE_MINDMAP = `# AI 编程实战
## 环境搭建
### 安装 Node
### 配置 Cursor
## 核心功能
### 视频下载
### AI 总结
#### 字幕提取
#### 流式摘要
#### 思维导图
## 优化扩展
### Markdown 渲染
### 导图导出
### 字幕下载
`;

export default function SummaryPreviewPage() {
  const [tab, setTab] = useState<"md" | "map">("md");

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-2 text-xl font-bold text-[#0f172a]">
        总结 UI 预览（开发用）
      </h1>
      <p className="mb-6 text-sm text-[#64748b]">
        用固定样例测试 Markdown 渲染与思维导图全屏 / PNG / SVG 导出，无需真实总结视频。
      </p>
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("md")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
            tab === "md"
              ? "bg-[#1677ff] text-white"
              : "bg-[#f1f5f9] text-[#64748b]"
          }`}
        >
          Markdown
        </button>
        <button
          type="button"
          onClick={() => setTab("map")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
            tab === "map"
              ? "bg-[#1677ff] text-white"
              : "bg-[#f1f5f9] text-[#64748b]"
          }`}
        >
          思维导图
        </button>
      </div>
      {tab === "md" ? (
        <div className="rounded-xl border border-[#eef0f3] bg-white p-6">
          <MarkdownContent content={SAMPLE_MD} />
        </div>
      ) : (
        <MindMapView markdown={SAMPLE_MINDMAP} />
      )}
    </main>
  );
}
