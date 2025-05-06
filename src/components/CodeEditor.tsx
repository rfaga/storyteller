"use client";

import { useEffect, useRef } from "react";
import * as monaco from "monaco-editor";

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  language?: string;
}

export default function CodeEditor({
  code,
  onChange,
  language = "typescript",
}: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(
    null
  );

  useEffect(() => {
    if (editorRef.current && !monacoEditorRef.current) {
      monacoEditorRef.current = monaco.editor.create(editorRef.current, {
        value: code,
        language,
        theme: "vs-dark",
        automaticLayout: true,
        minimap: {
          enabled: false,
        },
        scrollBeyondLastLine: false,
        fontSize: 14,
        lineNumbers: "on",
        renderLineHighlight: "all",
        scrollbar: {
          vertical: "visible",
          horizontal: "visible",
          useShadows: false,
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
        },
      });

      monacoEditorRef.current.onDidChangeModelContent(() => {
        const value = monacoEditorRef.current?.getValue() || "";
        onChange(value);
      });
    }

    return () => {
      if (monacoEditorRef.current) {
        monacoEditorRef.current.dispose();
        monacoEditorRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (
      monacoEditorRef.current &&
      code !== monacoEditorRef.current.getValue()
    ) {
      monacoEditorRef.current.setValue(code);
    }
  }, [code]);

  return (
    <div
      ref={editorRef}
      className="w-full h-[600px] rounded-lg overflow-hidden"
    />
  );
}
