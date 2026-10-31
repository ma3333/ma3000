import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

// Every request gets a correlation id (reused if a valid one is supplied) that is echoed back to the client.
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incoming = req.header(REQUEST_ID_HEADER);
    const id = incoming && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID();
    (req as Request & { id: string }).id = id;
    res.setHeader(REQUEST_ID_HEADER, id);
    next();
  }
}
