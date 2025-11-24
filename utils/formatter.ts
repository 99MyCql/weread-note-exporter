import { Note, Chapter, ExportConfig } from '../types';

export const generateExportText = (chapters: Chapter[], config: ExportConfig): string => {
    let output = '';

    if (config.includeTitle) {
        output += `# Reading Notes\n\n`;
    }

    chapters.forEach((chapter, chapterIndex) => {
        // Add chapter header if enabled
        if (config.includeChapter) {
            output += `\n## ${chapter.title}\n\n`;
        }

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