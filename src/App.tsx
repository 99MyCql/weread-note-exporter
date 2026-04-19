import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Chapter, ExportConfig } from '../types';
import { generateExportText } from '../utils/formatter';
import { Loader2, Download, Settings, BookOpen, CheckSquare, Copy, Check, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { errorHandler } from './errorHandler';

// --- Components ---

/**
 * 支持半选 indeterminate 状态的 checkbox
 */
const IndeterminateCheckbox: React.FC<{
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
  className?: string;
}> = ({ checked, indeterminate, onChange, className }) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked;
  }, [indeterminate, checked]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      className={className}
    />
  );
};

const ChapterItem: React.FC<{
  chapter: Chapter;
  isSelected: boolean;
  isExpanded: boolean;
  isCollapsed?: boolean;
  // header 专属：子节点总笔记数、全选状态、半选状态
  headerTotalNotes?: number;
  headerAllSelected?: boolean;
  headerSomeSelected?: boolean;
  onToggleSelect: (uid: number) => void;
  onToggleExpand: (uid: number) => void;
  onToggleHeader?: (uid: number) => void;
  onToggleHeaderSelect?: (uid: number) => void;
}> = ({
  chapter, isSelected, isExpanded, isCollapsed = false,
  headerTotalNotes = 0, headerAllSelected = false, headerSomeSelected = false,
  onToggleSelect, onToggleExpand, onToggleHeader, onToggleHeaderSelect
}) => {
  const isHeader = chapter.notes.length === 0;
  const indentPx = (chapter.level - 1) * 16;

  // 左边框颜色，按层级变化
  const accentColors = [
    'border-blue-500',
    'border-violet-500',
    'border-rose-400',
    'border-amber-400',
  ];
  const accentColor = accentColors[Math.min(chapter.level - 1, accentColors.length - 1)];

  // --- 父级标题节点 ---
  if (isHeader) {
    return (
      <div
        className={`bg-white rounded-lg border border-gray-200 border-l-4 ${accentColor} shadow-sm overflow-hidden`}
        style={{ marginLeft: `${indentPx}px` }}
      >
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          {/* 公选框：支持半选状态 */}
          <IndeterminateCheckbox
            checked={headerAllSelected}
            indeterminate={headerSomeSelected}
            onChange={() => onToggleHeaderSelect?.(chapter.chapterUid)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 flex-shrink-0"
          />
          {/* 点击标题区域切换折叠 */}
          <div
            className="flex-1 min-w-0 flex items-center justify-between gap-2 cursor-pointer"
            onClick={() => onToggleHeader?.(chapter.chapterUid)}
          >
            <p className={`font-bold truncate ${
              chapter.level === 1 ? 'text-sm text-gray-900' : 'text-xs text-gray-700'
            }`}>
              {chapter.title}
            </p>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                {headerTotalNotes} {errorHandler.getUIText('notesCount')}
              </span>
              <div className={`transition-transform duration-200 ${
                isCollapsed ? '-rotate-90' : 'rotate-0'
              }`}>
                <ChevronDown size={14} className="text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- 普通笔记节点 ---
  return (
    <div
      className={`bg-white rounded-lg border shadow-sm overflow-hidden ${
        chapter.level > 1 ? 'border-gray-100' : 'border-gray-200'
      }`}
      style={{ marginLeft: `${indentPx}px` }}
    >
      <div
        className="flex items-center gap-2 p-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => onToggleExpand(chapter.chapterUid)}
      >
        <input
          type="checkbox"
          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          checked={isSelected}
          onChange={() => onToggleSelect(chapter.chapterUid)}
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex-1 min-w-0 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className={`truncate ${
              chapter.level > 1
                ? 'text-xs font-medium text-gray-700'
                : 'text-sm font-semibold text-gray-900'
            }`}>
              {chapter.title}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{chapter.notes.length} {errorHandler.getUIText('notesCount')}</p>
          </div>
          <div className={`transition-transform duration-200 flex-shrink-0 ml-2 ${
            isExpanded ? 'rotate-0' : '-rotate-90'
          }`}>
            <ChevronDown size={16} className="text-gray-400" />
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-100 p-2.5 space-y-1.5">
          {chapter.notes.map((note) => (
            <div key={note.noteId} className="bg-gray-50 rounded-lg p-2 text-sm">
              <p className="text-xs text-gray-400 mb-1">
                {new Date(note.createTime).toLocaleDateString()}
              </p>
              <p className="text-gray-800 leading-relaxed">{note.content}</p>
              {note.quote && (
                <div className="mt-1.5 p-2 bg-blue-50 rounded border border-blue-100 text-xs">
                  <p className="text-blue-700">原文: {note.quote}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


const App: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<'notes' | 'export'>('notes');
  const [currentLang, setCurrentLang] = useState<'zh' | 'en'>('zh');
  const [copied, setCopied] = useState<boolean>(false);
  
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<number>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());
  const [collapsedHeaders, setCollapsedHeaders] = useState<Set<number>>(new Set());

  // 预计算每个 header 的子节点集合和总笔记数
  const headerStats = useMemo(() => {
    const stats = new Map<number, { totalNotes: number; childUids: Set<number> }>();
    // 每次遇到 header，将其后续的有笔记项累计进所有祖先 header
    const activeHeaders: { uid: number; level: number }[] = [];

    for (const chapter of chapters) {
      // 清除同级及更深的斧头（层级变浅时子级失效）
      while (activeHeaders.length > 0 && activeHeaders[activeHeaders.length - 1].level >= chapter.level) {
        activeHeaders.pop();
      }

      if (chapter.notes.length === 0) {
        // 是 header，初始化统计
        stats.set(chapter.chapterUid, { totalNotes: 0, childUids: new Set() });
        activeHeaders.push({ uid: chapter.chapterUid, level: chapter.level });
      } else {
        // 是笔记项，累加到所有祖先 header
        for (const h of activeHeaders) {
          const stat = stats.get(h.uid);
          if (stat) {
            stat.totalNotes += chapter.notes.length;
            stat.childUids.add(chapter.chapterUid);
          }
        }
      }
    }
    return stats;
  }, [chapters]);
  
  // Export Config
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    includeTitle: true,
    includeChapter: true,
    includeReference: true,
    formatStr: '- {{createTime}}\n{{content}}\n  > 原文：{{reference}}',
    fileFormat: 'markdown'
  });


  useEffect(() => {
    // 设置错误处理器的语言
    errorHandler.setLanguage(currentLang);
    initialize();
  }, [currentLang]);

  const initialize = async () => {
    setLoading(true);
    setError(null);
    try {
      // 检查是否在Chrome扩展环境中
      if (typeof chrome === 'undefined' || !chrome.tabs) {
        throw errorHandler.createUserError(errorHandler.getErrorText('chromeNotSupported'));
      }

      // 获取当前活动标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab?.id || !tab.url?.includes('weread.qq.com/web/reader/')) {
        throw errorHandler.createUserError(errorHandler.getErrorText('notReaderPage'));
      }

      // 简化的脚本注入机制
      try {
        // 先尝试ping现有脚本
        await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
      } catch (pingError) {
        // 如果ping失败，尝试注入脚本
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });

          // 等待脚本加载
          await new Promise(resolve => setTimeout(resolve, 500));

          // 再次尝试ping
          await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
        } catch (injectError) {
          throw errorHandler.createUserError(errorHandler.getErrorText('scriptInjectionFailed'));
        }
      }

      // 直接调用内容脚本提取笔记数据
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractNotes' });

      if (!response) {
        throw errorHandler.createUserError(errorHandler.getErrorText('extractNotesFailed'));
      }

      const fetchedChapters = response;

      setChapters(fetchedChapters);

      // Select all chapters by default
      const allChapterIds = new Set(fetchedChapters.map((c: Chapter) => c.chapterUid));
      setSelectedChapterIds(allChapterIds as Set<number>);

      // Keep all chapters collapsed by default
      setExpandedChapters(new Set());

    } catch (err: any) {
      errorHandler.logError(err, 'Initialization failed');
      setError(errorHandler.getUserFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const toggleChapter = (uid: number) => {
    const newSet = new Set(selectedChapterIds);
    if (newSet.has(uid)) {
      newSet.delete(uid);
    } else {
      newSet.add(uid);
    }
    setSelectedChapterIds(newSet);
  };

  const toggleExpanded = (uid: number) => {
    const newSet = new Set(expandedChapters);
    if (newSet.has(uid)) {
      newSet.delete(uid);
    } else {
      newSet.add(uid);
    }
    setExpandedChapters(newSet);
  };

  const toggleHeader = (uid: number) => {
    const newSet = new Set(collapsedHeaders);
    if (newSet.has(uid)) newSet.delete(uid); else newSet.add(uid);
    setCollapsedHeaders(newSet);
  };

  // 点击 header 的 checkbox：全选或全不选其子节点
  const toggleHeaderSelect = (uid: number) => {
    const stat = headerStats.get(uid);
    if (!stat || stat.childUids.size === 0) return;
    const allSelected = [...stat.childUids].every(cid => selectedChapterIds.has(cid));
    const newSet = new Set(selectedChapterIds);
    if (allSelected) {
      stat.childUids.forEach(cid => newSet.delete(cid));
    } else {
      stat.childUids.forEach(cid => newSet.add(cid));
    }
    setSelectedChapterIds(newSet);
  };

  const toggleAll = () => {
    const notesChapters = chapters.filter(c => c.notes.length > 0);
    if (selectedChapterIds.size === notesChapters.length) {
      setSelectedChapterIds(new Set());
    } else {
      setSelectedChapterIds(new Set(notesChapters.map(c => c.chapterUid)));
    }
  };

  // 计算可见章节列表：折叠的 header 会隐藏其后所有 level 更深的子项
  const visibleChapters = useCallback((): Chapter[] => {
    const result: Chapter[] = [];
    // 记录当前正被折叠的各层级 header（level -> true）
    const collapsedAtLevel = new Map<number, boolean>();

    for (const chapter of chapters) {
      // 清除比当前层级更深的折叠状态（遇到同级或更浅的新节点时，子级折叠失效）
      for (const [lvl] of collapsedAtLevel) {
        if (lvl >= chapter.level) collapsedAtLevel.delete(lvl);
      }

      // 检查当前节点是否被某个祖先 header 折叠
      let hidden = false;
      for (const [lvl] of collapsedAtLevel) {
        if (lvl < chapter.level) { hidden = true; break; }
      }
      if (hidden) continue;

      result.push(chapter);

      // 如果是被折叠的 header，记录其层级
      if (chapter.notes.length === 0 && collapsedHeaders.has(chapter.chapterUid)) {
        collapsedAtLevel.set(chapter.level, true);
      }
    }
    return result;
  }, [chapters, collapsedHeaders]);

  const getFilteredChapters = useCallback(() => {
    // 导出时不受折叠影响，仅按勾选过滤（header 节点透传给 formatter 处理）
    return chapters.filter(c => c.notes.length === 0 || selectedChapterIds.has(c.chapterUid));
  }, [chapters, selectedChapterIds]);

  const handleExport = () => {
    const filteredChapters = getFilteredChapters();
    const text = generateExportText(filteredChapters, exportConfig);
    
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weread-notes.${exportConfig.fileFormat === 'markdown' ? 'md' : 'txt'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    if (copied) return; // 防止重复点击

    const filteredChapters = getFilteredChapters();
    const text = generateExportText(filteredChapters, exportConfig);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-700">
        <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center space-y-4 max-w-xs">
          <div className="relative">
            <Loader2 className="animate-spin w-12 h-12 text-blue-600" />
            <div className="absolute inset-0 w-12 h-12 bg-blue-100 rounded-full animate-ping opacity-20"></div>
          </div>
          <p className="text-gray-700 font-medium">{errorHandler.getUIText('connecting')}</p>
          <div className="w-8 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full bg-gradient-to-br from-red-50 to-pink-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-pink-100 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-lg">
              <AlertCircle size={28} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">{errorHandler.getUIText('connectionError')}</h3>
            <p className="text-gray-600 text-sm mb-8 leading-relaxed">{error}</p>
            <button
              onClick={initialize}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {errorHandler.getUIText('retry')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 px-4 py-3 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <BookOpen className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{errorHandler.getUIText('title')}</h1>
              <p className="text-sm text-gray-600 font-medium">
                {chapters.length} {errorHandler.getUIText('chaptersFound')} • {chapters.reduce((sum, ch) => sum + (ch.notes?.length || 0), 0)} {errorHandler.getUIText('notesFound')}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentLang('zh')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                currentLang === 'zh'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              中文
            </button>
            <button
              onClick={() => setCurrentLang('en')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                currentLang === 'en'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-gray-200/50">
        <div className="flex">
          <button
            onClick={() => setCurrentTab('notes')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 px-4 text-xs font-medium transition-all duration-200 border-b-2 ${
              currentTab === 'notes'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/30'
            }`}
          >
            <CheckSquare size={16} />
            {errorHandler.getUIText('notesTab')}
          </button>
          <button
            onClick={() => setCurrentTab('export')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 px-4 text-xs font-medium transition-all duration-200 border-b-2 ${
              currentTab === 'export'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/30'
            }`}
          >
            <Settings size={16} />
            {errorHandler.getUIText('formatTab')}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3">

        {/* Tab: Notes Selection */}
        {currentTab === 'notes' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200/50 p-3 mb-3">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold text-gray-900">{errorHandler.getUIText('selectChapters')}</h2>
                <button
                  onClick={toggleAll}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors"
                >
                  {selectedChapterIds.size === chapters.filter(c => c.notes.length > 0).length ? errorHandler.getUIText('deselectAll') : errorHandler.getUIText('selectAll')}
                </button>
              </div>
              <div className="space-y-1.5">
                {visibleChapters().map(chapter => {
                  const stat = headerStats.get(chapter.chapterUid);
                  const isHeader = chapter.notes.length === 0;
                  const headerAllSelected = isHeader && !!stat && stat.childUids.size > 0
                    && [...stat.childUids].every(cid => selectedChapterIds.has(cid));
                  const headerSomeSelected = isHeader && !!stat
                    && [...stat.childUids].some(cid => selectedChapterIds.has(cid))
                    && !headerAllSelected;
                  return (
                    <ChapterItem
                      key={chapter.chapterUid}
                      chapter={chapter}
                      isSelected={selectedChapterIds.has(chapter.chapterUid)}
                      isExpanded={expandedChapters.has(chapter.chapterUid)}
                      isCollapsed={collapsedHeaders.has(chapter.chapterUid)}
                      headerTotalNotes={stat?.totalNotes}
                      headerAllSelected={headerAllSelected}
                      headerSomeSelected={headerSomeSelected}
                      onToggleSelect={toggleChapter}
                      onToggleExpand={toggleExpanded}
                      onToggleHeader={toggleHeader}
                      onToggleHeaderSelect={toggleHeaderSelect}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Export Settings */}
        {currentTab === 'export' && (
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Options Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Settings size={18} className="text-blue-600" />
                {errorHandler.getUIText('options')}
              </h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors group">
                  <input
                    type="checkbox"
                    checked={exportConfig.includeTitle}
                    onChange={e => setExportConfig({...exportConfig, includeTitle: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                  />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 transition-colors">
                    {errorHandler.getUIText('includeBookTitle')}
                  </span>
                </label>
                <label className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-blue-50 transition-colors group">
                  <input
                    type="checkbox"
                    checked={exportConfig.includeChapter}
                    onChange={e => setExportConfig({...exportConfig, includeChapter: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                  />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 transition-colors">
                    {errorHandler.getUIText('includeChapterHeaders')}
                  </span>
                </label>
                <label className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-blue-50 transition-colors group">
                  <input
                    type="checkbox"
                    checked={exportConfig.includeReference}
                    onChange={e => setExportConfig({...exportConfig, includeReference: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                  />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 transition-colors">
                    {errorHandler.getUIText('includeReferenceText')}
                  </span>
                </label>
              </div>
            </div>

            {/* Template Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">{errorHandler.getUIText('template')}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setExportConfig({...exportConfig, formatStr: '- {{createTime}}\n{{content}}\n  > 原文：{{reference}}'})}
                    className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors"
                  >
                    {errorHandler.getUIText('markdown')}
                  </button>
                  <button
                    onClick={() => setExportConfig({...exportConfig, formatStr: '{{content}}\n原文: {{reference}}\n(Date: {{createTime}})'})}
                    className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors"
                  >
                    {errorHandler.getUIText('simple')}
                  </button>
                  <button
                    onClick={() => setExportConfig({...exportConfig, formatStr: '- {{content}}'})}
                    className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors"
                  >
                    {errorHandler.getUIText('list')}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-medium bg-blue-50 p-3 rounded-lg">
                  {errorHandler.getUIText('variables')}: {'{{content}}'}, {'{{createTime}}'}, {'{{chapter}}'}, {'{{reference}}'}
                </p>
                <textarea
                  value={exportConfig.formatStr}
                  onChange={e => setExportConfig({...exportConfig, formatStr: e.target.value})}
                  className="w-full h-32 p-4 text-sm border-2 border-gray-200 rounded-xl font-mono text-gray-700 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none resize-y transition-all"
                  placeholder="输入自定义模板..."
                />
              </div>
            </div>

            {/* Preview Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-4">
              <h3 className="text-lg font-bold text-gray-900 mb-3">{errorHandler.getUIText('preview')}</h3>
              <div className="p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg text-xs font-mono text-gray-600 border border-gray-200 overflow-hidden text-ellipsis whitespace-pre-wrap min-h-[60px]">
                {chapters.length > 0 ? generateExportText(chapters.slice(0, 1), exportConfig) : errorHandler.getUIText('noNotesToPreview')}
              </div>
            </div>
          </div>
        )}


      </div>

      {/* Footer Actions */}
      <div className="bg-white/90 backdrop-blur-md p-3 border-t border-gray-200/50 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)] sticky bottom-0">
        <div className="max-w-2xl mx-auto flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 bg-white border border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 rounded-sm font-medium transition-all duration-200 group text-xs"
          >
            <div className="p-1 bg-gray-100 group-hover:bg-blue-100 rounded transition-colors">
              {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
            </div>
            {copied ? '复制成功' : errorHandler.getUIText('copyText')}
          </button>
          <button
            onClick={handleExport}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 rounded-sm font-medium transition-all duration-200 text-xs"
          >
            <div className="p-1 bg-white/20 rounded">
              <Download size={16} />
            </div>
            {errorHandler.getUIText('exportFile')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;