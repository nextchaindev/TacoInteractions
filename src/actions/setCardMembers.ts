import { noAuthResponse } from '../util';
import { ActionFunction, ActionType } from '../util/actions';
import { uncacheBoard, uncacheCard } from '../util/api';
import { createT } from '../util/locale';
import { prisma } from '../util/prisma';
import Trello from '../util/trello';
import { TrelloMember } from '../util/types';

export const action: ActionFunction = {
  type: ActionType.SET_CARD_MEMBERS,
  requiresData: true,
  async onAction(ctx, action, data: TrelloMember[]) {
    const userData = await prisma.user.findUnique({
      where: { userID: action.user }
    });

    const t = createT(userData?.locale);
    if (!userData || !userData.trelloToken) return void ctx.editParent(noAuthResponse(t));
    if (!userData.currentBoard)
      return void ctx.editParent({ content: t('switch.no_board_command'), components: [], embeds: [] });

    // action.extra would be the card id
    await new Trello(userData.trelloToken).updateCard(action.extra, { idMembers: data.map((m) => m.id).join(',') });
    await uncacheBoard(userData.currentBoard);
    await uncacheCard(action.extra);

    return void ctx.editParent(t('edit.members_updated'), { components: [], embeds: [] });
  }
};