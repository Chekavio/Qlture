import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    console.log('[DEBUG] CurrentUser decorator - data:', data);
    console.log('[DEBUG] CurrentUser decorator - user:', user);

    // Si on demande un champ précis, on le retourne
    if (data) {
      console.log('[DEBUG] CurrentUser decorator - returning:', user?.[data]);
      return user?.[data];
    }

    // Sinon, retourne tout l'objet
    return user;
  },
);
