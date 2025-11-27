import { useRef, useState, useCallback, useEffect } from "react";

interface UseMonacoEditorOptions {
  value: string;
  language?: string;
  theme?: string;
  readOnly?: boolean;
  onValueChange?: (value: string) => void;
  onEditorReady?: (editor: any) => void;
}

interface UseMonacoEditorReturn {
  editorRef: React.RefObject<any>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isEditorReady: boolean;
  isLoading: boolean;
  setValue: (value: string) => void;
  getValue: () => string;
  updateOptions: (options: any) => void;
}

export function useMonacoEditor({
  value,
  language = "javascript",
  theme = "vs-light",
  readOnly = false,
  onValueChange,
  onEditorReady,
}: UseMonacoEditorOptions): UseMonacoEditorReturn {
  const editorRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [internalValue, setInternalValue] = useState(value);
  const extraLibDisposersRef = useRef<any[]>([]);

  // Initialize Monaco if not already loaded
  useEffect(() => {
    if (!window.monaco) {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.1/min/vs/loader.min.js";
      script.onload = () => {
        window.require.config({
          paths: {
            vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.1/min/vs",
          },
        });
        window.require(["vs/editor/editor.main"], () => {
          // Monaco is now available
          if (containerRef.current) {
            initializeEditor();
          }
        });
      };
      document.head.appendChild(script);
    } else if (containerRef.current) {
      initializeEditor();
    }
  }, []);

  // Update internal value when prop changes
  useEffect(() => {
    if (value !== internalValue) {
      setInternalValue(value);
      if (editorRef.current && isEditorReady) {
        const currentValue = editorRef.current.getValue();
        if (currentValue !== value) {
          editorRef.current.setValue(value);
        }
      }
    }
  }, [value, internalValue, isEditorReady]);

  const initializeEditor = useCallback(() => {
    if (!containerRef.current || !window.monaco) return;

    try {
      editorRef.current = window.monaco.editor.create(containerRef.current, {
        value: internalValue,
        language,
        theme,
        readOnly,
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: "on",
        formatOnPaste: true,
        formatOnType: true,
        // Performance optimizations
        renderWhitespace: "none",
        renderLineHighlight: "all",
        smoothScrolling: true,
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        largeFileOptimizations: true,
        maxTokenizationLineLength: 20000,
        // Prevent flashing
        fixedOverflowWidgets: true,
        overviewRulerBorder: false,
        // Better scroll behavior
        scrollbar: {
          vertical: "visible",
          horizontal: "visible",
          verticalScrollbarSize: 12,
          horizontalScrollbarSize: 12,
          useShadows: false,
        },
      });

      // Set up change listener
      editorRef.current.onDidChangeModelContent(() => {
        const newValue = editorRef.current.getValue();
        setInternalValue(newValue);
        onValueChange?.(newValue);
      });

      // Configure language-specific settings
      if (language === "javascript" || language === "typescript") {
        window.monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions(
          {
            noSemanticValidation: false,
            noSyntaxValidation: false,
          }
        );

        window.monaco.languages.typescript.javascriptDefaults.setCompilerOptions(
          {
            target: window.monaco.languages.typescript.ScriptTarget.ES2020,
            allowNonTsExtensions: true,
            moduleResolution:
              window.monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            module: window.monaco.languages.typescript.ModuleKind.CommonJS,
            noEmit: true,
            typeRoots: ["node_modules/@types"],
          }
        );

        // Inject ambient typings for runtime-injected globals used in the editor
        const ambientGlobalsDts = [
          "declare const firebaseUtils: any;",
          "declare const db: any;",
          "declare const auth: any;",
          "declare const storage: any;",
          "declare const collection: any;",
          "declare const doc: any;",
          "declare const getDocs: any;",
          "declare const addDoc: any;",
          "declare const updateDoc: any;",
          "declare const deleteDoc: any;",
          "declare function query(...args: any[]): any;",
          "declare function where(...args: any[]): any;",
          "declare function orderBy(...args: any[]): any;",
          "declare function serverTimestamp(...args: any[]): any;",
        ].join("\n");

        // Dispose previous extra libs to avoid duplicates
        if (extraLibDisposersRef.current.length) {
          extraLibDisposersRef.current.forEach((d) => d?.dispose?.());
          extraLibDisposersRef.current = [];
        }

        const jsLib =
          window.monaco.languages.typescript.javascriptDefaults.addExtraLib(
            ambientGlobalsDts,
            "inmemory://model/firebase-runtime-globals-js.d.ts"
          );
        const tsLib =
          window.monaco.languages.typescript.typescriptDefaults.addExtraLib(
            ambientGlobalsDts,
            "inmemory://model/firebase-runtime-globals-ts.d.ts"
          );
        extraLibDisposersRef.current.push(jsLib, tsLib);
      }

      setIsEditorReady(true);
      setIsLoading(false);
      onEditorReady?.(editorRef.current);
    } catch (error) {
      console.error("Failed to initialize Monaco editor:", error);
      setIsLoading(false);
    }
  }, [language, theme, readOnly, internalValue, onValueChange, onEditorReady]);

  const setValue = useCallback(
    (newValue: string) => {
      if (editorRef.current && isEditorReady) {
        editorRef.current.setValue(newValue);
        setInternalValue(newValue);
      }
    },
    [isEditorReady]
  );

  const getValue = useCallback(() => {
    if (editorRef.current && isEditorReady) {
      return editorRef.current.getValue();
    }
    return internalValue;
  }, [isEditorReady, internalValue]);

  const updateOptions = useCallback(
    (options: any) => {
      if (editorRef.current && isEditorReady) {
        editorRef.current.updateOptions(options);
      }
    },
    [isEditorReady]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
      }
    };
  }, []);

  return {
    editorRef,
    containerRef,
    isEditorReady,
    isLoading,
    setValue,
    getValue,
    updateOptions,
  };
}
