"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="edu-markdown text-sm leading-7">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => <h1 className="mb-3 mt-1 text-xl font-extrabold tracking-tight text-slate-950">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-3 mt-1 text-lg font-extrabold tracking-tight text-slate-950">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-2 mt-4 text-base font-bold text-slate-900">{children}</h3>,
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-bold text-slate-950">{children}</strong>,
          ul: ({ children }) => <ul className="mb-3 ml-5 list-disc space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 ml-5 list-decimal space-y-1">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          blockquote: ({ children }) => <blockquote className="my-3 border-l-4 border-blue-300 bg-blue-50 px-4 py-2 text-slate-700">{children}</blockquote>,
          code: ({ className, children }) => {
            const isBlock = Boolean(className);
            return isBlock ? (
              <code className="block overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">{children}</code>
            ) : (
              <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.9em] text-slate-800">{children}</code>
            );
          },
          pre: ({ children }) => <pre className="mb-3 overflow-hidden rounded-xl">{children}</pre>,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full border-collapse text-left text-xs sm:text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
          th: ({ children }) => <th className="border-b border-slate-200 px-3 py-2 font-bold text-slate-800">{children}</th>,
          td: ({ children }) => <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700 last:border-b-0">{children}</td>,
          hr: () => <hr className="my-4 border-slate-200" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
