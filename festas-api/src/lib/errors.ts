/** Erro de aplicação com status HTTP — capturado pelo error handler do Fastify. */
export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

export const badRequest = (m: string) => new AppError(m, 400);
export const unauthorized = (m = 'Não autorizado') => new AppError(m, 401);
export const notFound = (m = 'Não encontrado') => new AppError(m, 404);
export const conflict = (m: string) => new AppError(m, 409);
