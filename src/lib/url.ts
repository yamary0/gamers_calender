import type { NextRequest } from 'next/server';

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const normalizeBaseUrl = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return stripTrailingSlash(url.origin);
  } catch {
    return null;
  }
};

export const resolveBaseUrl = (request: NextRequest): string | null => {
  const originFromNextUrl = normalizeBaseUrl(request.nextUrl.origin);
  if (originFromNextUrl) {
    return originFromNextUrl;
  }

  const originHeader = normalizeBaseUrl(request.headers.get('origin'));
  if (originHeader) {
    return originHeader;
  }

  const forwardedHost = request.headers.get('x-forwarded-host');
  if (forwardedHost) {
    const protocol =
      request.headers.get('x-forwarded-proto') ??
      request.headers.get('x-forwarded-protocol') ??
      'https';
    return `${protocol}://${stripTrailingSlash(forwardedHost)}`;
  }

  const host = request.headers.get('host');
  if (host) {
    const protocol = request.headers.get('x-forwarded-proto') ?? 'https';
    return `${protocol}://${stripTrailingSlash(host)}`;
  }

  return normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL);
};

export const buildSessionUrl = (
  baseUrl: string | null,
  guildSlug: string,
  sessionId: string,
): string | null => {
  if (!baseUrl) {
    return null;
  }

  return `${baseUrl}/g/${guildSlug}/sessions/${sessionId}`;
};
