// 内容脚本 - 在微信读书页面中运行
console.log('微信读书笔记导出器已加载');

// CSS选择器常量
const CSS_SELECTORS = {
  NOTE_LIST_CONTAINER: '.readerNoteList',
  CHAPTER_WRAPPER: '.wr_reader_note_panel_chapter_wrapper',
  CHAPTER_TITLE: '.wr_reader_note_panel_chapter_title',
  NOTE_ITEM: '.wr_reader_note_panel_item_cell_wrapper',
  NOTE_CONTENT: '.wr_reader_note_panel_item_cell_content_text',
  NOTE_REFERENCE: '.wr_reader_note_panel_item_cell_content_ref',
  // 目录相关选择器
  CATALOG_BUTTON: '.readerControls_item.catalog',
  CATALOG_CONTAINER: '.readerCatalog',
  CATALOG_LIST_ITEM: '.readerCatalog_list_item',
};

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('收到消息:', request);

  if (request.action === 'extractNotes') {
    // 使用异步流程：先获取目录顺序，再提取并排序笔记
    extractChapterNotesWithOrder().then(result => {
      sendResponse(result);
    }).catch(err => {
      console.error('提取笔记失败:', err);
      // 降级：直接返回未排序的笔记
      sendResponse(extractChapterNotes());
    });
    return true; // 保持消息通道开放（异步必须）
  }

  // 添加一个简单的ping消息来确认连接
  if (request.action === 'ping') {
    sendResponse({ success: true, message: 'Content script is ready' });
    return true;
  }
});

/**
 * 从目录侧边栏获取章节的正确顺序（按书籍真实目录排序）
 * 返回: 章节标题数组，按目录顺序排列
 */
async function getCatalogOrder() {
  // 检查目录侧边栏是否已经打开
  let catalogContainer = document.querySelector(CSS_SELECTORS.CATALOG_CONTAINER);
  let needsClose = false;

  if (!catalogContainer || catalogContainer.children.length === 0) {
    // 目录未打开，找目录按钮并点击
    const catalogBtn = document.querySelector(CSS_SELECTORS.CATALOG_BUTTON);
    if (!catalogBtn) {
      console.log('未找到目录按钮，无法获取目录顺序');
      return null;
    }

    catalogBtn.click();
    needsClose = true;

    // 等待目录渲染（最多等待 2 秒）
    await new Promise(resolve => {
      let attempts = 0;
      const check = () => {
        catalogContainer = document.querySelector(CSS_SELECTORS.CATALOG_CONTAINER);
        const items = catalogContainer
          ? catalogContainer.querySelectorAll(CSS_SELECTORS.CATALOG_LIST_ITEM)
          : [];
        if (items.length > 0) {
          resolve();
        } else if (attempts < 20) {
          attempts++;
          setTimeout(check, 100);
        } else {
          resolve(); // 超时也继续
        }
      };
      setTimeout(check, 100);
    });
  }

  // 读取目录项的标题，按 DOM 顺序（即书籍真实章节顺序）
  catalogContainer = document.querySelector(CSS_SELECTORS.CATALOG_CONTAINER);
  const items = catalogContainer
    ? catalogContainer.querySelectorAll(CSS_SELECTORS.CATALOG_LIST_ITEM)
    : [];

  const orderedTitles = Array.from(items).map(item => item.textContent?.trim() || '');
  console.log(`目录顺序（共 ${orderedTitles.length} 章）:`, orderedTitles);

  // 如果是我们主动打开的目录，用完后关闭
  if (needsClose) {
    const catalogBtn = document.querySelector(CSS_SELECTORS.CATALOG_BUTTON);
    if (catalogBtn) catalogBtn.click();
  }

  return orderedTitles.length > 0 ? orderedTitles : null;
}

/**
 * 获取笔记并按目录顺序排序章节
 */
async function extractChapterNotesWithOrder() {
  // 并行：获取目录顺序 + 提取笔记
  const [catalogOrder, chapters] = await Promise.all([
    getCatalogOrder(),
    Promise.resolve(extractChapterNotes())
  ]);

  if (!catalogOrder || catalogOrder.length === 0) {
    console.log('未获取到目录顺序，返回原始章节顺序');
    return chapters;
  }

  // 构建标题 -> 顺序的映射表
  const orderMap = new Map();
  catalogOrder.forEach((title, index) => {
    if (title) orderMap.set(title, index);
  });

  // 按目录顺序排序章节（模糊匹配：先精确匹配，再检查包含关系）
  const getSortIndex = (chapterTitle) => {
    // 1. 精确匹配
    if (orderMap.has(chapterTitle)) {
      return orderMap.get(chapterTitle);
    }
    // 2. 目录标题包含章节标题（处理目录中有些项比笔记面板中的标题更长的情况）
    for (const [catalogTitle, idx] of orderMap) {
      if (catalogTitle.includes(chapterTitle) || chapterTitle.includes(catalogTitle)) {
        return idx;
      }
    }
    // 3. 找不到则排在最后
    return Infinity;
  };

  const sorted = [...chapters].sort((a, b) => {
    return getSortIndex(a.title) - getSortIndex(b.title);
  });

  console.log('按目录顺序排序后的章节:', sorted.map(c => c.title));
  return sorted;
}

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

      let finalContent = noteContent;
      let finalReference = reference;

      // 处理只有text没有reference的情况（此时text为原文引用）
      if (noteContent && !referenceElement) {
        finalContent = '';
        finalReference = noteContent;
      }

      if (finalContent || finalReference) {
        notes.push({
          noteId: `note_${chapterUid}_${noteIndex}`,
          content: finalContent,
          quote: finalReference,
          createTime: Date.now()
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