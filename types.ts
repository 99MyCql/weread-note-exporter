export interface Note {
    noteId: string;
    content: string;
    createTime: number;
    range: {
        start: number;
        end: number;
    };
    abstract?: string; // Sometimes context around the highlight
}

export interface Chapter {
    chapterUid: number;
    chapterIdx: number;
    title: string;
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