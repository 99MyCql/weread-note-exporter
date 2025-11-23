// 内容脚本 - 在微信读书页面中运行
console.log('微信读书笔记导出器已加载');

// CSS选择器常量
const CSS_SELECTORS = {
  NOTE_LIST_CONTAINER: '.readerNoteList',
  CHAPTER_WRAPPER: '.wr_reader_note_panel_chapter_wrapper',
  CHAPTER_TITLE: '.wr_reader_note_panel_chapter_title',
  NOTE_ITEM: '.wr_reader_note_panel_item_cell_wrapper',
  NOTE_CONTENT: '.wr_reader_note_panel_item_cell_content_text',
  NOTE_REFERENCE: '.wr_reader_note_panel_item_cell_content_ref'
};

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('收到消息:', request);

  if (request.action === 'extractNotes') {
    const result = extractChapterNotes();
    sendResponse(result);
    return true; // 保持消息通道开放
  }

  // 添加一个简单的ping消息来确认连接
  if (request.action === 'ping') {
    sendResponse({ success: true, message: 'Content script is ready' });
    return true;
  }
});

function extractChapterNotes() {
  // 精确查找笔记列表容器
  const noteListContainer = document.querySelector(CSS_SELECTORS.NOTE_LIST_CONTAINER);

  if (!noteListContainer) {
    console.log('未找到笔记列表容器');
    return [];
  }

  const chaptersWithNotes = [];

  // 获取所有章节容器 - 使用精确选择器
  const chapterContainers = noteListContainer.querySelectorAll(CSS_SELECTORS.CHAPTER_WRAPPER);

  console.log(`找到 ${chapterContainers.length} 个章节容器`);

  Array.from(chapterContainers).forEach((chapterContainer, chapterIndex) => {
    // 精确获取章节标题
    const titleElement = chapterContainer.querySelector(CSS_SELECTORS.CHAPTER_TITLE);
    const chapterTitle = titleElement ? titleElement.textContent?.trim() : `第${chapterIndex + 1}章`;

    // 生成唯一的章节ID
    const chapterUid = Date.now() + chapterIndex;

    const notes = [];

    // 在当前章节容器中查找笔记项 - 使用精确选择器
    const noteItems = chapterContainer.querySelectorAll(CSS_SELECTORS.NOTE_ITEM);

    console.log(`章节 "${chapterTitle}" 中找到 ${noteItems.length} 条笔记`);

    Array.from(noteItems).forEach((noteItem, noteIndex) => {
      // 精确获取笔记内容
      const contentElement = noteItem.querySelector(CSS_SELECTORS.NOTE_CONTENT);
      const noteContent = contentElement ? contentElement.textContent?.trim() : '';

      // 精确获取原文引用
      const referenceElement = noteItem.querySelector(CSS_SELECTORS.NOTE_REFERENCE);
      const reference = referenceElement ? referenceElement.textContent?.trim() : '';

      if (noteContent) {
        notes.push({
          noteId: `note_${chapterUid}_${noteIndex}`,
          content: noteContent,
          abstract: reference,
          createTime: Date.now(),
          range: {
            start: noteIndex,
            end: noteIndex + noteContent.length
          }
        });
      }
    });

    // 只有当章节有笔记时才添加到结果中
    if (notes.length > 0) {
      chaptersWithNotes.push({
        chapterUid: chapterUid,
        chapterIdx: chapterIndex + 1,
        title: chapterTitle,
        notes: notes
      });
    }
  });

  console.log('提取到的笔记：', chaptersWithNotes);
  return chaptersWithNotes;
}