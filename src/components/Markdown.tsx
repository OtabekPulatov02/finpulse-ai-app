/* Лёгкий Markdown-рендерер для ответов ИИ: заголовки, списки (маркированные и
   нумерованные), таблицы, блоки кода, цитаты, линии, **жирный**, *курсив*,
   `код`, [ссылки](https://…). Без dangerouslySetInnerHTML: всё — React-узлы,
   ссылки только http(s). */
import type { ReactNode } from "react";

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(?<![*\w])\*(?!\s)(.+?)(?<!\s)\*(?![*\w])/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const id = `${key}-${k++}`;
    if (m[1] !== undefined) out.push(<strong key={id} className="font-semibold">{inline(m[1], id)}</strong>);
    else if (m[2] !== undefined) out.push(<code key={id} className="rounded bg-black/[0.06] px-1 py-0.5 font-mono text-[12px]">{m[2]}</code>);
    else if (m[3] !== undefined) out.push(<a key={id} href={m[4]} target="_blank" rel="noreferrer" className="text-brand-600 underline underline-offset-2 hover:text-brand-700">{m[3]}</a>);
    else if (m[5] !== undefined) out.push(<em key={id}>{m[5]}</em>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
const isTableSep = (l: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(l);
const cells = (l: string) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
const numeric = (s: string) => /^[−\-+]?[\d\s .,]+(%|\s?(сум|UZS|₽|\$))?$/.test(s.replace(/\*\*/g, "").trim());

export function Markdown({ text }: { text: string }) {
  const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0, b = 0;
  while (i < lines.length) {
    const line = lines[i];
    const key = `b${b++}`;
    if (!line.trim()) { i++; continue; }

    if (/^\s*```/.test(line)) {
      const buf: string[] = []; i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      blocks.push(<pre key={key} className="overflow-x-auto rounded-lg bg-slate-900 px-3 py-2 font-mono text-[12px] text-slate-100">{buf.join("\n")}</pre>);
      continue;
    }
    if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const head = cells(line); i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) rows.push(cells(lines[i++]));
      const right = head.map((_, c) => rows.length > 0 && rows.every((r) => !r[c] || numeric(r[c])));
      blocks.push(
        <div key={key} className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-slate-50 text-[12px] text-slate-500">
              <tr>{head.map((h, c) => <th key={c} className={`px-3 py-2 font-medium whitespace-nowrap ${right[c] ? "text-right" : ""}`}>{inline(h, `${key}h${c}`)}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, ri) => (
                <tr key={ri}>{head.map((_, c) => <td key={c} className={`px-3 py-2 align-top ${right[c] ? "text-right tabular-nums whitespace-nowrap" : ""}`}>{inline(r[c] ?? "", `${key}r${ri}c${c}`)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const size = h[1].length <= 2 ? "text-[15px]" : "text-[14px]";
      blocks.push(<div key={key} className={`${size} font-semibold`}>{inline(h[2], key)}</div>);
      i++; continue;
    }
    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) { blocks.push(<hr key={key} className="border-slate-200" />); i++; continue; }
    if (/^\s*>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ""));
      blocks.push(<blockquote key={key} className="border-l-2 border-slate-300 pl-3 text-slate-600">{inline(buf.join(" "), key)}</blockquote>);
      continue;
    }
    const listRe = /^(\s*)([-*•]|\d+[.)])\s+(.*)$/;
    if (listRe.test(line)) {
      const ordered = /^\s*\d+[.)]/.test(line);
      const items: { depth: number; text: string; n?: string }[] = [];
      while (i < lines.length && (listRe.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length))) {
        const m = listRe.exec(lines[i]);
        if (m) items.push({ depth: m[1].length >= 2 ? 1 : 0, text: m[3], n: /\d/.test(m[2]) ? m[2].replace(")", ".") : undefined });
        else items[items.length - 1].text += " " + lines[i].trim();
        i++;
      }
      blocks.push(
        <ul key={key} className="space-y-1">
          {items.map((it, ii) => (
            <li key={ii} className={`flex gap-2 ${it.depth ? "pl-5" : ""}`}>
              <span className="shrink-0 text-slate-400 tabular-nums select-none">{ordered && it.n ? it.n : "•"}</span>
              <span className="min-w-0">{inline(it.text, `${key}i${ii}`)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && !listRe.test(lines[i]) && !/^(#{1,4})\s/.test(lines[i]) && !/^\s*```/.test(lines[i]) && !(isTableRow(lines[i]) && i + 1 < lines.length && isTableSep(lines[i + 1]))) buf.push(lines[i++]);
    blocks.push(<p key={key}>{buf.map((l, li) => <span key={li}>{inline(l, `${key}l${li}`)}{li < buf.length - 1 && <br />}</span>)}</p>);
  }
  return <div className="space-y-2.5 leading-relaxed">{blocks}</div>;
}
