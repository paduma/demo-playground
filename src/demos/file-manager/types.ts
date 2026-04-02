/** 文件节点类型 */
export type FileNodeType = 'folder' | 'file';

/** 文件类型 */
export type FileCategory = 'image' | 'document' | 'spreadsheet' | 'pdf' | 'code' | 'archive' | 'video' | 'audio' | 'other';

/** 文件/文件夹节点 */
export interface FileNode {
  id: string;
  name: string;
  type: FileNodeType;
  category?: FileCategory;
  size?: number;         // bytes
  modifiedAt: string;    // ISO date
  children?: FileNode[];
}

const EXT_MAP: Record<string, FileCategory> = {
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', svg: 'image', webp: 'image',
  doc: 'document', docx: 'document', txt: 'document', md: 'document',
  xls: 'spreadsheet', xlsx: 'spreadsheet', csv: 'spreadsheet',
  pdf: 'pdf',
  js: 'code', ts: 'code', tsx: 'code', jsx: 'code', json: 'code', html: 'code', css: 'code', py: 'code', java: 'code',
  zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', gz: 'archive',
  mp4: 'video', avi: 'video', mov: 'video', mkv: 'video',
  mp3: 'audio', wav: 'audio', flac: 'audio',
};

export function getCategory(name: string): FileCategory {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return EXT_MAP[ext] || 'other';
}

export const CATEGORY_ICONS: Record<FileCategory, string> = {
  image: '🖼️', document: '📄', spreadsheet: '📊', pdf: '📕',
  code: '💻', archive: '📦', video: '🎬', audio: '🎵', other: '📎',
};

export const FOLDER_ICON = '📁';
export const FOLDER_OPEN_ICON = '📂';

export function formatSize(bytes?: number): string {
  if (bytes === undefined) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

let _uid = 0;
export function genFileId(): string {
  return `file_${Date.now()}_${++_uid}`;
}
