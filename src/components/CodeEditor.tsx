import React, { useEffect, useRef, useState } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { syntaxHighlighting, indentOnInput, bracketMatching, foldGutter, foldKeymap, HighlightStyle } from '@codemirror/language';
import { oneDark } from '@codemirror/theme-one-dark';
import { tags } from '@lezer/highlight';

const customHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#c678dd' },
  { tag: tags.comment, color: '#5c6370', fontStyle: 'italic' },
  { tag: tags.string, color: '#98c379' },
  { tag: tags.number, color: '#d19a66' },
  { tag: tags.bool, color: '#d19a66' },
  { tag: tags.null, color: '#d19a66' },
  { tag: tags.operator, color: '#56b6c2' },
  { tag: tags.className, color: '#e5c07b' },
  { tag: tags.definition(tags.variableName), color: '#e06c75' },
  { tag: tags.function(tags.variableName), color: '#61afef' },
  { tag: tags.propertyName, color: '#e06c75' },
  { tag: tags.typeName, color: '#e5c07b' },
  { tag: tags.regexp, color: '#98c379' },
]);
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { rust } from '@codemirror/lang-rust';
import { cpp } from '@codemirror/lang-cpp';
import { X, Save, Circle } from 'lucide-react';
import { OpenTab } from '../types';

interface CodeEditorProps {
  tabs: OpenTab[];
  activeTab: string | null;
  onTabSelect: (path: string) => void;
  onTabClose: (path: string) => void;
  onContentChange: (path: string, content: string) => void;
  onSave: (path: string) => void;
}

function getLanguageExtension(language: string) {
  switch (language) {
    case 'javascript':
    case 'typescript':
    case 'jsx':
    case 'tsx':
      return javascript({ typescript: language === 'typescript' || language === 'tsx', jsx: language === 'jsx' || language === 'tsx' });
    case 'python':
      return python();
    case 'html':
      return html();
    case 'css':
      return css();
    case 'json':
      return json();
    case 'markdown':
      return markdown();
    case 'rust':
      return rust();
    case 'c':
    case 'cpp':
      return cpp();
    default:
      return [];
  }
}

export function CodeEditor({ tabs, activeTab, onTabSelect, onTabClose, onContentChange, onSave }: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const languageCompartment = useRef(new Compartment());
  const [currentContent, setCurrentContent] = useState('');

  useEffect(() => {
    if (!editorRef.current) return;

    const tab = tabs.find(t => t.path === activeTab);
    const content = tab?.content || '';
    setCurrentContent(content);

    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    const saveKeymap = [{
      key: 'Mod-s',
      run: () => {
        if (activeTab) {
          onSave(activeTab);
        }
        return true;
      },
    }];

    const state = EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        syntaxHighlighting(customHighlightStyle),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          indentWithTab,
          ...saveKeymap,
        ]),
        oneDark,
        languageCompartment.current.of(tab ? getLanguageExtension(tab.language) : []),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && activeTab) {
            const newContent = update.state.doc.toString();
            setCurrentContent(newContent);
            onContentChange(activeTab, newContent);
          }
        }),
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': { overflow: 'auto' },
          '.cm-content': { minHeight: '100%' },
        }),
      ],
    });

    viewRef.current = new EditorView({
      state,
      parent: editorRef.current,
    });

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [activeTab]);

  // Update language when tab changes
  useEffect(() => {
    if (!viewRef.current) return;
    const tab = tabs.find(t => t.path === activeTab);
    if (tab) {
      viewRef.current.dispatch({
        effects: languageCompartment.current.reconfigure(getLanguageExtension(tab.language)),
      });
    }
  }, [activeTab, tabs]);

  const activeTabData = tabs.find(t => t.path === activeTab);

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e]">
      {/* Tabs */}
      <div className="flex items-center bg-gray-900 border-b border-gray-700 overflow-x-auto min-h-[36px]">
        {tabs.map(tab => (
          <div
            key={tab.path}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs cursor-pointer border-r border-gray-700 min-w-0 max-w-[200px] group
              ${tab.path === activeTab ? 'bg-[#1e1e1e] text-white border-t-2 border-t-blue-500' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}
            onClick={() => onTabSelect(tab.path)}
          >
            {tab.isModified && <Circle size={8} className="text-orange-400 fill-orange-400 shrink-0" />}
            <span className="truncate">{tab.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onTabClose(tab.path); }}
              className="ml-1 p-0.5 rounded hover:bg-gray-600 opacity-0 group-hover:opacity-100 shrink-0"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        {activeTabData ? (
          <div ref={editorRef} className="h-full" />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-4">👨‍💻</div>
              <p className="text-lg">Откройте файл для редактирования</p>
              <p className="text-sm mt-2 text-gray-600">Выберите файл в проводнике или используйте Ctrl+S для сохранения</p>
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      {activeTabData && (
        <div className="flex items-center justify-between px-3 py-1 bg-blue-600 text-white text-xs">
          <div className="flex items-center gap-4">
            <span>{activeTabData.language}</span>
            <span>UTF-8</span>
          </div>
          <div className="flex items-center gap-4">
            {activeTabData.isModified && <span className="text-yellow-200">Modified</span>}
            <button
              onClick={() => onSave(activeTab!)}
              className="flex items-center gap-1 hover:bg-blue-700 px-2 py-0.5 rounded"
            >
              <Save size={12} />
              Save (Ctrl+S)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
