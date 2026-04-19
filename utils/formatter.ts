import { Note, Chapter, ExportConfig } from '../types';

export const generateExportText = (chapters: Chapter[], config: ExportConfig): string => {
    let output = '';

    if (config.includeTitle) {
        output += `# Reading Notes\n\n`;
    }

    chapters.forEach((chapter, chapterIndex) => {
        // Add chapter header if enabled
        // level 1 → ##（H2，书名占 H1）；level 2 → ###；以此类推
        if (config.includeChapter) {
            const headingMarks = '#'.repeat(chapter.level + 1);
            output += `\n${headingMarks} ${chapter.title}\n\n`;
        }

        // 纯标题节点（无笔记）不输出笔记内容，直接 continue
        if (chapter.notes.length === 0) return;

        // Add notes for this chapter
        chapter.notes.forEach((note, noteIndex) => {
            let noteText = config.formatStr;

            // Replace placeholders with actual data
            noteText = noteText.replace(/{{content}}/g, note.content);

            const dateStr = new Date(note.createTime).toLocaleDateString();
            noteText = noteText.replace(/{{createTime}}/g, dateStr);

            noteText = noteText.replace(/{{chapter}}/g, chapter.title);

            // Replace reference placeholder
            const referenceText = (config.includeReference && note.quote) ? note.quote : '';
            noteText = noteText.replace(/{{reference}}/g, referenceText);

            output += noteText + '\n\n';
        });
    });

    return output;
};