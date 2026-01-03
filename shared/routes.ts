import { z } from 'zod';
import { insertAdSchema, insertReportSchema, ads, reports } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  ads: {
    list: {
      method: 'GET' as const,
      path: '/api/ads',
      responses: {
        200: z.array(z.custom<typeof ads.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/ads/:id',
      responses: {
        200: z.custom<typeof ads.$inferSelect & { reports: typeof reports.$inferSelect[] }>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/ads',
      input: insertAdSchema,
      responses: {
        201: z.custom<typeof ads.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/ads/:id',
      input: insertAdSchema.partial(),
      responses: {
        200: z.custom<typeof ads.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/ads/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    sync: {
      method: 'POST' as const,
      path: '/api/ads/:id/sync',
      responses: {
        200: z.object({ message: z.string(), newReports: z.number() }),
        404: errorSchemas.notFound,
      },
    }
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
