import { ActionFunction, ActionType } from '../util/actions';
import { createT } from '../util/locale';
import { prisma } from '../util/prisma';
import Trello from '../util/trello';

export const action: ActionFunction = {
  type: ActionType.USER_CLEAR_AUTH,
  async onAction(ctx, action) {
    const userData = await prisma.user.findUnique({
      where: { userID: action.user }
    });

    const t = createT(userData?.locale);

    if (!userData || !userData.trelloToken) return void ctx.editParent(t('clearauth.no_auth'), { components: [] });

    await new Trello(userData.trelloToken).invalidate();
    await prisma.user.update({
      where: { userID: action.user },
      data: { trelloID: null, trelloToken: null }
    });

    return void ctx.editParent(t('clearauth.done'), { components: [] });
  }
};