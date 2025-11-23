import { translations, type Language } from './i18n';
export { translations, type Language };

export class ErrorHandler {
  private currentLanguage: Language['code'] = 'zh';

  constructor(language: Language['code'] = 'zh') {
    this.currentLanguage = language;
  }

  setLanguage(language: Language['code']) {
    this.currentLanguage = language;
  }

  getLanguage(): Language['code'] {
    return this.currentLanguage;
  }

  // 根据错误类型返回用户友好的错误消息
  getUserFriendlyError(error: any): string {
    const t = translations[this.currentLanguage].errors;

    // 如果错误已经有用户友好的消息，直接返回
    if (error?.userFriendly) {
      return error.message;
    }

    const errorMessage = error?.message || error?.toString() || '';

    // 根据错误消息内容判断错误类型
    if (errorMessage.includes('Chrome') || errorMessage.includes('chrome')) {
      return t.chromeNotSupported;
    }

    if (errorMessage.includes('weread.qq.com') || errorMessage.includes('WeRead')) {
      return t.notWeReadPage;
    }

    if (errorMessage.includes('scripting') || errorMessage.includes('inject')) {
      return `${t.scriptInjectionFailed}. ${t.ensureScriptPermission}`;
    }

    if (errorMessage.includes('not responding') || errorMessage.includes('ping')) {
      return t.contentScriptNotResponding;
    }

    if (errorMessage.includes('communication') || errorMessage.includes('message')) {
      return `${t.connectionFailed}. ${t.pleaseRefreshPage}`;
    }

    if (errorMessage.includes('extractNotes') || errorMessage.includes('Failed to load data')) {
      return t.extractNotesFailed;
    }

    if (errorMessage.includes('No notes found') || errorMessage.includes('No chapters found')) {
      return t.noNotesFound;
    }

    // 默认返回通用错误消息
    return `${t.unknownError}: ${errorMessage}`;
  }

  // 创建带有用户友好消息的错误对象
  createUserError(message: string, technicalDetails?: string): Error {
    const error = new Error(message);
    (error as any).userFriendly = true;
    if (technicalDetails) {
      (error as any).technicalDetails = technicalDetails;
    }
    return error;
  }

  // 获取UI文本
  getUIText(key: keyof typeof translations.zh.ui): string {
    return translations[this.currentLanguage].ui[key];
  }

  // 获取错误消息
  getErrorText(key: keyof typeof translations.zh.errors): string {
    return translations[this.currentLanguage].errors[key];
  }

  // 记录错误到控制台
  logError(error: any, context?: string) {
    console.error(`[WeRead Exporter Error] ${context || ''}:`, error);

    // 如果有技术细节，也记录下来
    if (error?.technicalDetails) {
      console.error('Technical details:', error.technicalDetails);
    }
  }
}

// 创建全局错误处理器实例
export const errorHandler = new ErrorHandler();