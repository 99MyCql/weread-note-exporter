// 内容脚本 - 在微信读书页面中运行
console.log('微信读书笔记导出器已加载 (API 版)');

// CSS选择器常量 (仅保留提取书名和目录的容器)
const CSS_SELECTORS = {
  CATALOG_BUTTON: '.readerControls_item.catalog',
  CATALOG_CONTAINER: '.readerCatalog',
  CATALOG_LIST_ITEM: '.readerCatalog_list_item',
  CATALOG_ITEM_INNER: '.readerCatalog_list_item_inner',
  CATALOG_ITEM_TITLE: '.readerCatalog_list_item_title_text',
  BOOK_TITLE: '.readerCatalog_bookInfo_title_txt',
};

/**
 * 获取书名：优先从目录侧边栏读取，兜底用 document.title
 */
function getBookTitle() {
  const el = document.querySelector(CSS_SELECTORS.BOOK_TITLE);
  if (el && el.textContent.trim()) return el.textContent.trim();
  return document.title.split(' - ')[0].trim() || 'Reading Notes';
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('收到消息:', request);

  if (request.action === 'extractNotes') {
    const bookTitle = getBookTitle();
    // 使用异步流程：从 API 获取笔记数据，从 DOM 获取目录树
    extractChapterNotesWithOrder().then(chapters => {
      sendResponse({ bookTitle, chapters });
    }).catch(err => {
      console.error('提取笔记失败:', err);
      sendResponse({ bookTitle, chapters: [], error: String(err) });
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

  // 读取目录项的标题，按 DOM 顺序
  catalogContainer = document.querySelector(CSS_SELECTORS.CATALOG_CONTAINER);
  const items = catalogContainer
    ? catalogContainer.querySelectorAll(CSS_SELECTORS.CATALOG_LIST_ITEM)
    : [];

  const catalogEntries = Array.from(items).map(item => {
    const titleEl = item.querySelector(CSS_SELECTORS.CATALOG_ITEM_TITLE);
    const title = titleEl ? titleEl.textContent?.trim() || '' : item.textContent?.trim() || '';

    // 层级，默认是 1
    const innerEl = item.querySelector(CSS_SELECTORS.CATALOG_ITEM_INNER);
    let level = 1;
    if (innerEl) {
      const levelMatch = innerEl.className.match(/readerCatalog_list_item_level_(\d+)/);
      if (levelMatch) level = parseInt(levelMatch[1], 10);
    }

    return { title, level };
  });

  // 如果是我们主动打开的目录，用完后关闭
  if (needsClose) {
    const catalogBtn = document.querySelector(CSS_SELECTORS.CATALOG_BUTTON);
    if (catalogBtn) catalogBtn.click();
  }

  return catalogEntries.length > 0 ? catalogEntries : null;
}

/**
 * 提取纯数字 bookId
 */
function getNumericBookId() {
  try {
    const ldJson = document.querySelector('script[type="application/ld+json"]');
    if (ldJson) {
      const data = JSON.parse(ldJson.textContent);
      const id = data['@Id'] || data.bookId;
      if (id) return String(id);
    }
  } catch (e) { }

  const entries = performance.getEntriesByType('resource');
  for (const e of entries) {
    const m = e.name.match(/bookId=([0-9]+)/);
    if (m) return m[1];
  }
  return null;
}

/**
 * 统一从两个 API 抓取笔记数据：纯划线 API + 评论 API
 * 返回结构: Map<chapterUid, Note[]>
 * 以及补充返回: Map<chapterUid, chapterTitle> 因为某些章节可能只在笔记里出现而没被抓取到
 */
async function fetchAPINotes(numericBookId) {
  if (!numericBookId) throw new Error("无法获取 numericBookId");

  const notesByChapter = new Map();
  const chapterTitles = new Map(); // 用于兜底目录
  let noteIndex = 0; // 全局唯一标识生成辅助

  // 并行请求两个接口
  // bookmarklist: 纯划线
  // review/list: 评论（包含带划线的短评，章末点评等）
  const [bookmarkResp, reviewResp] = await Promise.allSettled([
    fetch(`https://weread.qq.com/web/book/bookmarklist?bookId=${numericBookId}`, { credentials: 'include' }),
    fetch(`https://weread.qq.com/web/review/list?bookId=${numericBookId}&listType=11&mine=1&synckey=0`, { credentials: 'include' }),
  ]);

  // 辅助函数：组装记录
  const addNote = (chapterUid, chapterName, content, quote, createTime, isDuplicate = false) => {
    if (!notesByChapter.has(chapterUid)) notesByChapter.set(chapterUid, []);
    if (chapterName) chapterTitles.set(chapterUid, chapterName);
    
    // 如果一条笔记既没有评论内容，也没有原文（极小概率），直接忽略
    if (!content && !quote) return;

    notesByChapter.get(chapterUid).push({
      noteId: `api_${chapterUid}_${++noteIndex}`,
      content: content || '',
      quote: quote || '',
      createTime: createTime ? createTime * 1000 : Date.now(), // 转换为 JavaScript 毫秒级时间戳
      isDuplicate
    });
  };

  // 用于精确去重标识：如果在书的某段话既划了线，又写了评语。
  // Bookmark 接口会返回纯划线，Review 接口会返回带评语的划线，这两条记录的 range 是一致的。
  const handledRanges = new Set();
  try {
    if (reviewResp.status === 'fulfilled' && reviewResp.value.ok) {
      const data = await reviewResp.value.json();
      for (const r of (data.reviews || [])) {
        const review = r.review || r;
        
        // 划线原文（章末评论时为空）
        const quote = review.abstract?.trim() || '';  
        // 用户的个人评语
        const content = review.content?.trim() || ''; 
        const ts = review.createTime;
        const cUid = review.chapterUid;
        const cTitle = review.chapterTitle;
        // range 表示该条笔记在书本中精确的起始位置和结束位置 (如 "11811-11833")
        const range = review.range;
        
        if (range) handledRanges.add(range); // 记录划线位置避免重复
        if (cUid !== undefined) addNote(cUid, cTitle, content, quote, ts);
      }
    }
  } catch (e) { console.warn('处理 review list 失败', e); }

  // 2. 处理 bookmarklist (纯划线)
  try {
    if (bookmarkResp.status === 'fulfilled' && bookmarkResp.value.ok) {
      const data = await bookmarkResp.value.json();
      for (const item of (data.updated || [])) {
        const quote = item.markText?.trim() || '';
        const ts = item.createTime;
        const cUid = item.chapterUid;
        const cTitle = item.chapterName;
        const range = item.range;
        
        // 如果这个划线范围内用户已经写过评论处理过了，那这里就是单纯的一条重复高亮底色。
        // 我们将其标记为 isDuplicate = true，由前端选项决定是否展示
        const isDuplicate = Boolean(quote && range && handledRanges.has(range));
        
        if (quote) {
           addNote(cUid, cTitle, '', quote, ts, isDuplicate);
        }
      }
    }
  } catch (e) { console.warn('处理 bookmark list 失败', e); }

  // 单章内的笔记按时间升序（阅读顺序）排序
  for (const [uid, notes] of notesByChapter.entries()) {
    notes.sort((a, b) => a.createTime - b.createTime);
  }

  return { notesByChapter, chapterTitles };
}

/**
 * 主提取与组合逻辑：以目录树为基准骨架，将 API 的笔记挂载上去
 */
async function extractChapterNotesWithOrder() {
  const numericBookId = getNumericBookId();
  if (!numericBookId) {
    throw new Error('未找到 numericBookId。可能是页面未加载完全或 URL 不匹配。');
  }

  // 并行：获取侧边栏目录框架 + 从 API 获取全量笔记数据
  const [catalogEntries, apiData] = await Promise.all([
    getCatalogOrder(),
    fetchAPINotes(numericBookId)
  ]);

  const { notesByChapter, chapterTitles } = apiData;

  // 如果没有侧边栏目录（DOM 获取失败等极端情况）
  // 按照有笔记的 chapterUid 降级为平铺结构
  if (!catalogEntries || catalogEntries.length === 0) {
    console.log('未获取到目录骨架，使用 API 自带章节降级展示');
    const fallbackChapters = [];
    let idx = 1;
    // 根据 uid 从小到大排序（基本上也是顺沿阅读进度）
    const sortedUids = Array.from(notesByChapter.keys()).sort((a, b) => a - b);
    for (const uid of sortedUids) {
      fallbackChapters.push({
        chapterUid: uid,
        chapterIdx: idx++,
        title: chapterTitles.get(uid) || `第${idx}章`,
        level: 1, // 降级无视层级
        notes: notesByChapter.get(uid) || []
      });
    }
    return fallbackChapters;
  }

  // ---- 完全基于目录骨架和章节文本名的匹配挂载 ----
  // 注意：侧边栏目录（DOM）往往没有 `chapterUid` 属性暴露，只有文本。
  // 我们需要用 API 中提取的 `chapterTitles` 将 `chapterUid` 映射到侧边栏目录
  
  const result = [];
  const headerStack = new Map(); // level -> { entry, emitted }
  let headerUidSeed = -1; // 为空父目录生成负数虚拟 UID
  
  // 反向查找：通过标题找 UID
  function findUidByTitle(title) {
    for (const [uid, t] of chapterTitles.entries()) {
      if (t === title || t.includes(title) || title.includes(t)) return uid;
    }
    return null;
  }

  // 记录哪些有笔记的章已被输出
  const emittedUids = new Set();

  for (const entry of catalogEntries) {
    const mappedUid = findUidByTitle(entry.title);
    const hasNotes = mappedUid !== null && notesByChapter.has(mappedUid) && notesByChapter.get(mappedUid).length > 0;

    if (hasNotes) {
      // 补出所有未输出的祖先标题（level < 当前level，从浅到深）
      const ancestorLevels = [...headerStack.keys()]
        .filter(lvl => lvl < entry.level)
        .sort((a, b) => a - b);

      for (const lvl of ancestorLevels) {
        const header = headerStack.get(lvl);
        if (header && !header.emitted) {
          result.push({
            chapterUid: headerUidSeed--,
            chapterIdx: 0,
            title: header.entry.title,
            level: lvl,
            notes: [],
          });
          header.emitted = true;
        }
      }

      // 输出本章节
      if (!emittedUids.has(mappedUid)) {
        result.push({
          chapterUid: mappedUid,
          chapterIdx: 0, // 可以忽略，只依赖数组顺序
          title: entry.title, // 以目录中更精准的 title 为准
          level: entry.level,
          notes: notesByChapter.get(mappedUid)
        });
        emittedUids.add(mappedUid);
      }
    } else {
      // 无笔记，存为潜在祖先标题
      for (const lvl of [...headerStack.keys()]) {
        if (lvl >= entry.level) headerStack.delete(lvl);
      }
      headerStack.set(entry.level, { entry, emitted: false });
    }
  }

  // 兜底：如果 API 里有些笔记，其 chapterTitle 在侧边栏目录中完全匹配不上
  // 直接追加在最后（作为孤立章节）
  for (const [uid, notes] of notesByChapter.entries()) {
    if (!emittedUids.has(uid) && notes.length > 0) {
      result.push({
        chapterUid: uid,
        chapterIdx: 0,
        title: chapterTitles.get(uid) || '未知章节',
        level: 1,
        notes: notes
      });
    }
  }

  return result;
}