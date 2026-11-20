import { Fragment } from "react";
import { safeHref } from "@/lib/utils";

/**
 * Minimal, safe Markdown renderer for admin-edited pages.
 * Supports: ## / ### headings, paragraphs, - and 1. lists, **bold**, *italic*, [links](url).
 * Everything is rendered as React text nodes (no raw HTML), so it cannot inject scripts.
 */
function inline(text: string, keyBase: string) {
  const out: React.ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[2]) out.push(<strong key={`${keyBase}-${i++}`}>{m[2]}</strong>);
    else if (m[3]) out.push(<em key={`${keyBase}-${i++}`}>{m[3]}</em>);
    else if (m[4]) {
      const href = safeHref(m[5]);
      const external = /^https?:/i.test(href);
      out.push(
        <a key={`${keyBase}-${i++}`} href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {m[4]}
        </a>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source }: { source: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flushPara = () => {
    if (para.length) blocks.push(<p key={`p${blocks.length}`}>{inline(para.join(" "), `p${blocks.length}`)}</p>);
    para = [];
  };
  const flushList = () => {
    if (list) {
      const items = list.items.map((it, j) => <li key={j}>{inline(it, `l${blocks.length}-${j}`)}</li>);
      blocks.push(list.ordered ? <ol key={`o${blocks.length}`}>{items}</ol> : <ul key={`u${blocks.length}`}>{items}</ul>);
    }
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushPara();
      flushList();
      continue;
    }
    const h = /^(#{2,3})\s+(.*)$/.exec(line);
    const ul = /^[-*]\s+(.*)$/.exec(line);
    const ol = /^\d+[.)]\s+(.*)$/.exec(line);
    if (h) {
      flushPara();
      flushList();
      blocks.push(h[1].length === 2 ? <h2 key={`h${blocks.length}`}>{inline(h[2], `h${blocks.length}`)}</h2> : <h3 key={`h${blocks.length}`}>{inline(h[2], `h${blocks.length}`)}</h3>);
    } else if (ul || ol) {
      flushPara();
      const ordered = !!ol;
      if (list && list.ordered !== ordered) flushList();
      if (!list) list = { ordered, items: [] };
      list.items.push((ul ?? ol)![1]);
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return <Fragment>{blocks}</Fragment>;
}
