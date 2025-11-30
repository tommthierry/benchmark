// Markdown renderer component
// Renders markdown content with proper styling using react-markdown

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

interface MarkdownProps {
  /** The markdown content to render */
  children: string;
  /** Additional CSS classes */
  className?: string;
  /** Compact mode for inline/preview use (smaller text, less spacing) */
  compact?: boolean;
}

/**
 * Renders markdown content with GitHub Flavored Markdown support.
 * Supports: tables, strikethrough, task lists, autolinks, etc.
 */
export function Markdown({ children, className = '', compact = false }: MarkdownProps) {
  const baseClass = compact ? 'markdown-compact' : 'markdown-content';

  return (
    <div className={`${baseClass} ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

/**
 * Custom component overrides for styling
 */
const markdownComponents: Components = {
  // Headings
  h1: ({ children }) => (
    <h1 className="text-xl font-bold mt-4 mb-2 text-[var(--color-text-primary)]">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-semibold mt-3 mb-2 text-[var(--color-text-primary)]">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold mt-2 mb-1 text-[var(--color-text-primary)]">{children}</h3>
  ),

  // Paragraphs
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
  ),

  // Lists
  ul: ({ children }) => (
    <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-[var(--color-text-secondary)]">{children}</li>
  ),

  // Code
  code: ({ className, children, ...props }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)] text-[var(--color-accent)] text-sm font-mono">
          {children}
        </code>
      );
    }
    // Block code
    return (
      <code className={`block ${className ?? ''}`} {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-2 p-3 rounded-lg bg-[var(--color-bg-tertiary)] overflow-x-auto text-sm font-mono">
      {children}
    </pre>
  ),

  // Blockquote
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[var(--color-accent)] pl-3 my-2 text-[var(--color-text-secondary)] italic">
      {children}
    </blockquote>
  ),

  // Links
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[var(--color-accent)] hover:underline"
    >
      {children}
    </a>
  ),

  // Tables (GFM)
  table: ({ children }) => (
    <div className="overflow-x-auto mb-2">
      <table className="min-w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-[var(--color-bg-tertiary)]">{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-[var(--color-bg-tertiary)]">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left font-semibold text-[var(--color-text-primary)]">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-[var(--color-text-secondary)]">{children}</td>
  ),

  // Horizontal rule
  hr: () => <hr className="my-4 border-[var(--color-bg-tertiary)]" />,

  // Strong/Bold
  strong: ({ children }) => (
    <strong className="font-semibold text-[var(--color-text-primary)]">{children}</strong>
  ),

  // Emphasis/Italic
  em: ({ children }) => <em className="italic">{children}</em>,

  // Strikethrough (GFM)
  del: ({ children }) => (
    <del className="line-through text-[var(--color-text-muted)]">{children}</del>
  ),
};

/**
 * Compact inline markdown for previews (strips block elements)
 */
export function MarkdownInline({ children, className = '' }: Omit<MarkdownProps, 'compact'>) {
  return (
    <span className={`markdown-inline ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Force everything inline
          p: ({ children }) => <span>{children}</span>,
          h1: ({ children }) => <strong>{children}</strong>,
          h2: ({ children }) => <strong>{children}</strong>,
          h3: ({ children }) => <strong>{children}</strong>,
          ul: ({ children }) => <span>{children}</span>,
          ol: ({ children }) => <span>{children}</span>,
          li: ({ children }) => <span>{children} </span>,
          pre: ({ children }) => <code className="text-xs">{children}</code>,
          code: ({ children }) => (
            <code className="px-1 py-0.5 rounded bg-[var(--color-bg-tertiary)] text-[var(--color-accent)] text-xs font-mono">
              {children}
            </code>
          ),
          blockquote: ({ children }) => <span className="italic">"{children}"</span>,
          a: ({ children }) => <span className="text-[var(--color-accent)]">{children}</span>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
        }}
        allowedElements={['p', 'strong', 'em', 'code', 'a', 'del']}
        unwrapDisallowed
      >
        {children}
      </ReactMarkdown>
    </span>
  );
}
