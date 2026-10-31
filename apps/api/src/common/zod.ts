import { BadRequestException } from '@nestjs/common';
import type { z } from 'zod';
import { AttributeValidationError } from '../profile/attributes';

/** Parses a request body with zod and turns failures into a 400 with field paths. */
export function parseBody<S extends z.ZodType>(schema: S, body: unknown): z.infer<S> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException({
      message: 'קלט לא תקין',
      errors: result.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`),
    });
  }
  return result.data;
}

/** Maps attribute validation errors to a 400 response. */
export async function withAttributeErrors<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (e) {
    if (e instanceof AttributeValidationError)
      throw new BadRequestException({ message: 'שדות לא תקינים', errors: e.errors });
    throw e;
  }
}
