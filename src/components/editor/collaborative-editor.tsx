"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import { useCallback } from "react";
import type { RemoteCursor } from "@/lib/types";

interface CollaborativeEditorProps {
  value: string;
  language: string;
  onChange: (value: string) => void;
  onCursor: (cursor: { file: string; line: number; col: number; selection?: string }) => void;
  file: string;
  cursors: RemoteCursor[];
}

export function CollaborativeEditor({
  value,
  language,
  onChange,
  onCursor,
  file,
  cursors,
}: CollaborativeEditorProps) {
  const handleMount: OnMount = useCallback(
    (editor) => {
      editor.onDidChangeCursorPosition((event) => {
        const model = editor.getModel();
        const word = model?.getWordAtPosition(event.position);
        onCursor({
          file,
          line: event.position.lineNumber,
          col: event.position.column,
          selection: word?.word,
        });
      });
    },
    [file, onCursor],
  );

  return (
    <div className="relative h-full min-h-[420px] overflow-hidden border-0 bg-[#161513]">
      <Editor
        height="100%"
        theme="vs-dark"
        language={language}
        value={value}
        onChange={(next) => onChange(next ?? "")}
        onMount={handleMount}
        options={{
          fontSize: 14,
          fontFamily: "IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          padding: { top: 16 },
          automaticLayout: true,
          cursorBlinking: "smooth",
          renderLineHighlight: "all",
        }}
      />
      {cursors.length > 0 ? (
        <div className="pointer-events-none absolute right-3 top-3 flex flex-col gap-1">
          {cursors.map((cursor) => (
            <div
              key={cursor.pubkey}
              className="bg-background px-1.5 py-0.5 font-mono text-[10px] text-foreground"
            >
              L{cursor.line}:{cursor.col}
              {cursor.selection ? ` · ${cursor.selection}` : ""}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
