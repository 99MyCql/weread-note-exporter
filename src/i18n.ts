export interface Language {
  code: 'zh' | 'en';
  name: string;
}

export interface ErrorMessages {
  chromeNotSupported: string;
  notWeReadPage: string;
  notReaderPage: string;
  scriptInjectionFailed: string;
  contentScriptNotResponding: string;
  connectionFailed: string;
  extractNotesFailed: string;
  noNotesFound: string;
  unknownError: string;
  pleaseRefreshPage: string;
  ensureScriptPermission: string;
}

export interface UIText {
  title: string;
  subtitle: string;
  connecting: string;
  connectionError: string;
  retry: string;
  notesTab: string;
  formatTab: string;
  selectChapters: string;
  selectAll: string;
  deselectAll: string;
  chaptersFound: string;
  notesFound: string;
  notesCount: string;
  copyText: string;
  exportFile: string;
  options: string;
  template: string;
  noteTemplateProps: string;
  preview: string;
  includeBookTitle: string;
  includeChapterHeaders: string;
  includeReferenceText: string;
  removeDuplicateText: string;
  variables: string;
  noNotesToPreview: string;
  markdown: string;
  simple: string;
  list: string;
}

export const languages: Language[] = [
  { code: 'zh', name: '中文' },
  { code: 'en', name: 'English' }
];

export const translations: Record<Language['code'], { errors: ErrorMessages; ui: UIText }> = {
  zh: {
    errors: {
      chromeNotSupported: "请在Chrome浏览器中使用此扩展",
      notWeReadPage: "请先在微信读书页面打开一本书",
      notReaderPage: "请先选择书籍",
      scriptInjectionFailed: "内容脚本注入失败，请刷新页面后重试",
      contentScriptNotResponding: "内容脚本已注入但无响应，请刷新页面后重试",
      connectionFailed: "无法与页面建立连接，请刷新页面后重试",
      extractNotesFailed: "提取笔记失败",
      noNotesFound: "未找到笔记，请确保该书籍有笔记内容",
      unknownError: "未知错误",
      pleaseRefreshPage: "请刷新页面后重试",
      ensureScriptPermission: "请确保扩展具有脚本执行权限"
    },
    ui: {
      title: "微信读书笔记导出器",
      subtitle: "找到章节数 • 找到笔记数",
      connecting: "正在连接微信读书...",
      connectionError: "连接错误",
      retry: "重试",
      notesTab: "选择章节",
      formatTab: "导出格式",
      selectChapters: "选择章节",
      selectAll: "全选",
      deselectAll: "取消全选",
      chaptersFound: "章节数",
      notesFound: "笔记数",
      notesCount: "条笔记",
      copyText: "复制文本",
      exportFile: "导出文件",
      options: "选项",
      template: "模板",
      noteTemplateProps: "每条笔记的格式模板",
      preview: "预览（首条笔记）",
      includeBookTitle: "包含书籍标题",
      includeChapterHeaders: "包含章节标题",
      includeReferenceText: "包含原文引用",
      removeDuplicateText: "去除重复划线",
      variables: "变量",
      noNotesToPreview: "没有笔记可预览",
      markdown: "Markdown",
      simple: "简单",
      list: "列表"
    }
  },
  en: {
    errors: {
      chromeNotSupported: "Please use this extension in Chrome browser",
      notWeReadPage: "Please open a book on weread.qq.com first",
      notReaderPage: "Please select a book first",
      scriptInjectionFailed: "Content script injection failed. Please refresh the page and try again",
      contentScriptNotResponding: "Content script injected but not responding. Please refresh the page and try again",
      connectionFailed: "Unable to establish communication with the page. Please refresh and try again",
      extractNotesFailed: "Failed to extract notes.",
      noNotesFound: "No notes found. Please ensure the book has note content",
      unknownError: "Unknown error",
      pleaseRefreshPage: "Please refresh the page and try again",
      ensureScriptPermission: "Please ensure the extension has scripting permission"
    },
    ui: {
      title: "WeRead Exporter",
      subtitle: "Chapters • Notes Found",
      connecting: "Connecting to WeRead...",
      connectionError: "Connection Error",
      retry: "Retry",
      notesTab: "Select Chapters",
      formatTab: "Export Format",
      selectChapters: "Select Chapters",
      selectAll: "Select All",
      deselectAll: "Deselect All",
      chaptersFound: "Chapters",
      notesFound: "Notes Found",
      notesCount: "Notes",
      copyText: "Copy Text",
      exportFile: "Export File",
      options: "Options",
      template: "Template",
      noteTemplateProps: "Per-Note Format Template",
      preview: "Preview (First Note)",
      includeBookTitle: "Include Book Title",
      includeChapterHeaders: "Include Chapter Headers",
      includeReferenceText: "Include Reference Text",
      removeDuplicateText: "Remove Duplicates",
      variables: "Variables",
      noNotesToPreview: "No notes to preview",
      markdown: "Markdown",
      simple: "Simple",
      list: "List"
    }
  }
};