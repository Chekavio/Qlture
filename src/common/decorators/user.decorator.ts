import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return undefined;
    // Si on demande un champ précis, on le retourne
    if (data) {
      return user[data];
    }
    // Sinon, retourne tout l'objet
    return user;
  },
);
