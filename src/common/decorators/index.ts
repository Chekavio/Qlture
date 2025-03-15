import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

export const Pagination = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const {
      page = 1,
      limit = 10,
      orderBy = 'createdAt',
      order = 'desc',
    } = request.query;

    return {
      page: Number(page),
      limit: Number(limit),
      orderBy,
      order,
    };
  },
);
