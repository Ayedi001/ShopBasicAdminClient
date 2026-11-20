export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
    public fields?: Record<string, string>,
    public data?: unknown,
  ) {
    super(message ?? code);
  }
}

export const badRequest = (code: string, message?: string, fields?: Record<string, string>, data?: unknown) =>
  new AppError(400, code, message, fields, data);
export const unauthorized = (message = "Authentification requise") => new AppError(401, "UNAUTHORIZED", message);
export const forbidden = (message = "Accès refusé") => new AppError(403, "FORBIDDEN", message);
export const notFound = (message = "Ressource introuvable") => new AppError(404, "NOT_FOUND", message);
export const conflict = (code: string, message?: string, data?: unknown) => new AppError(409, code, message, undefined, data);
export const tooMany = (message = "Trop de tentatives. Réessayez plus tard.") => new AppError(429, "RATE_LIMITED", message);
