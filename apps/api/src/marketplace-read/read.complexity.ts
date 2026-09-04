import { BadRequestException, Injectable } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

@Injectable()
export class GraphqlComplexityMiddleware {
  use(request: Request, _response: Response, next: NextFunction) {
    if (request.path !== '/graphql') return next();
    const body = typeof request.body?.query === 'string' ? request.body.query : '';
    const depth = Math.max(0, (body.match(/[({]/g) ?? []).length);
    const points =
      body.length +
      (body.match(/\b(items|nodes|edges|listings|sales|activity)\b/g) ?? []).length * 25;
    if (depth > 20 || points > 5000)
      throw new BadRequestException('GraphQL query complexity exceeds the configured budget');
    return next();
  }
}
