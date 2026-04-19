export interface Note {
    noteId: string;
    content: string;
    quote: string;
    createTime: number;
}

export interface Chapter {
    chapterUid: number;
    chapterIdx: number;
    title: string;
    level: number;  // 章节层级：1 = 一级标题，2 = 二级标题，以此类推
    notes: Note[];
}

export interface ExportConfig {
    includeTitle: boolean;
    includeChapter: boolean;
    includeReference: boolean;
    formatStr: string;
    fileFormat: 'markdown' | 'txt';
}

export interface BookData {
    bookId: string;
    title: string;
    author: string;
    cover: string;
}

export interface Language {
    code: 'zh' | 'en';
    name: string;
}