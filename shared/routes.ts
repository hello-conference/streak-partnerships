import { z } from 'zod';
import { pipelineWithStagesSchema, boxSchema } from './schema';

export const errorSchemas = {
  internal: z.object({
    message: z.string(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  badRequest: z.object({
    message: z.string(),
  }),
};

export const api = {
  pipelines: {
    list: {
      method: 'GET' as const,
      path: '/api/pipelines',
      responses: {
        200: z.array(pipelineWithStagesSchema),
        500: errorSchemas.internal,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/pipelines/:key',
      responses: {
        200: pipelineWithStagesSchema,
        404: errorSchemas.notFound,
      },
    },
    getBoxes: {
      method: 'GET' as const,
      path: '/api/pipelines/:key/boxes',
      responses: {
        200: z.array(boxSchema),
        404: errorSchemas.notFound,
      },
    }
  },
  boxes: {
    get: {
      method: 'GET' as const,
      path: '/api/boxes/:key',
      responses: {
        200: boxSchema,
        404: errorSchemas.notFound,
      },
    },
    updateField: {
      method: 'POST' as const,
      path: '/api/boxes/:key/fields/:fieldKey',
      responses: {
        200: z.object({ success: z.boolean() }),
        500: errorSchemas.internal,
      },
    },
    exportContacts: {
      method: 'GET' as const,
      path: '/api/pipelines/:key/export-contacts',
      responses: {
        200: z.any(),
        500: errorSchemas.internal,
      },
    }
  },
  pretix: {
    getExhibitors: {
      method: 'GET' as const,
      path: '/api/pretix/:org/exhibitors',
      responses: { 200: z.array(z.any()), 500: errorSchemas.internal },
    },
    getExhibitorByName: {
      method: 'GET' as const,
      path: '/api/pretix/:org/exhibitors/by-name/:name',
      responses: { 200: z.any(), 404: errorSchemas.notFound, 500: errorSchemas.internal },
    },
    createExhibitor: {
      method: 'POST' as const,
      path: '/api/pretix/:org/exhibitors',
      responses: { 201: z.any(), 400: errorSchemas.badRequest, 500: errorSchemas.internal },
    },
    getExhibitorById: {
      method: 'GET' as const,
      path: '/api/pretix/:org/exhibitors/:id',
      responses: { 200: z.any(), 404: errorSchemas.notFound, 500: errorSchemas.internal },
    },
    getExhibitorVouchers: {
      method: 'GET' as const,
      path: '/api/pretix/:org/exhibitors/:id/vouchers',
      responses: { 200: z.any(), 500: errorSchemas.internal },
    },
    createMissingExhibitors: {
      method: 'POST' as const,
      path: '/api/pretix/:org/exhibitors/batch',
      responses: { 200: z.any(), 500: errorSchemas.internal },
    },
    getItems: {
      method: 'GET' as const,
      path: '/api/pretix/:org/items',
      responses: { 200: z.array(z.any()), 500: errorSchemas.internal },
    },
    getTicketSummary: {
      method: 'GET' as const,
      path: '/api/pretix/:org/ticket-summary',
      responses: { 200: z.any(), 500: errorSchemas.internal },
    },
  }
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
