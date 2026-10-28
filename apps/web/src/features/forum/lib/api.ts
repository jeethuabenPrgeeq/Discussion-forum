export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export type DownloadFormat = 'xlsx' | 'pdf' | 'csv';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiOptions extends Omit<RequestInit, 'body'> {
  json?: unknown;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  mime: string;
  url: string;
}

export interface ExportRequest {
  format: DownloadFormat;
  sections: string[];
  filename: string;
  group?: string;
  range?: 'all' | '7d' | '30d';
  attachments?: boolean;
}

const messageOf = (data: unknown) => {
  const raw = (data as { message?: string | string[] } | null)?.message;
  return Array.isArray(raw) ? raw[0] : raw;
};

export async function api<T>(path: string, { json, headers, ...init }: ApiOptions = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, messageOf(data) || 'Something went wrong. Please try again.');
  return data as T;
}

export async function uploadFile(file: File): Promise<UploadedFile> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_URL}/uploads`, { method: 'POST', body: form, credentials: 'include' });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const fallback = res.status === 413 ? `${file.name} is larger than 5 MB.` : `Could not upload ${file.name}.`;
    throw new ApiError(res.status, messageOf(data) || fallback);
  }
  return data as UploadedFile;
}

export async function uploadFiles(files: File[]): Promise<UploadedFile[]> {
  const uploaded: UploadedFile[] = [];
  for (const file of files) uploaded.push(await uploadFile(file));
  return uploaded;
}

export const fileUrl = (path: string) => `${API_URL}${path}`;

export async function downloadExport(forumId: string, request: ExportRequest) {
  const query = new URLSearchParams({ format: request.format, sections: request.sections.join(',') });
  if (request.group && request.group !== 'all') query.set('group', request.group);
  if (request.range && request.range !== 'all') query.set('range', request.range);
  const res = await fetch(`${API_URL}/forums/${forumId}/export?${query.toString()}`, { credentials: 'include' });
  if (!res.ok) {
    const data: unknown = await res.json().catch(() => null);
    throw new ApiError(res.status, messageOf(data) || 'Export failed. Please try again.');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${request.filename}.${request.attachments ? 'zip' : request.format}`;
  link.click();
  URL.revokeObjectURL(url);
}