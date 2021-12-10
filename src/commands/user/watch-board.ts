import { SlashCreator, CommandContext, AutocompleteContext, CommandOptionType } from 'slash-create';
import { prisma } from '../../util/prisma';
import SlashCommand from '../../command';
import { noAuthResponse, truncate } from '../../util';
import { getMember, updateBoardInMember } from '../../util/api';
import Trello from '../../util/trello';
import { createT } from '../../util/locale';

export default class WatchBoardCommand extends SlashCommand {
  constructor(creator: SlashCreator) {
    super(creator, {
      name: 'watch-board',
      description: 'Subscribe to a board to get notifications on Trello.com.',
      options: [{
        type: CommandOptionType.STRING,
        name: 'board',
        description: 'The board to watch, defaults to the selected board.',
        autocomplete: true
      }]
    });
  }

  async autocomplete(ctx: AutocompleteContext) {
    return this.autocompleteBoards(ctx, { filter: b => !b.closed });
  }

  async run(ctx: CommandContext) {
    const userData = await prisma.user.findUnique({
      where: { userID: ctx.user.id }
    });
    const t = createT(userData?.locale);
    if (!userData || !userData.trelloToken) return noAuthResponse(t);

    const member = await getMember(userData.trelloToken, userData.trelloID);

    let board = member.boards.find(b => b.id === ctx.options.board || b.shortLink === ctx.options.board);
    if (!board) board = member.boards.find(b => b.id === userData.currentBoard);
    if (!board) return t('query.not_found', { context: 'board' });

    const trello = new Trello(userData.trelloToken);
    const response = await trello.updateBoard(board.id, { subscribed: !board.subscribed });
    await updateBoardInMember(member.id, board.id, response.data);

    return t(board.subscribed ? 'watchboard.unwatched' : 'watchboard.watched', { board: truncate(board.name, 100) });
  }
}