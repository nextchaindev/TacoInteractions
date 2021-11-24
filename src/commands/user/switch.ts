import { SlashCreator, CommandContext, AutocompleteContext, CommandOptionType } from 'slash-create';
import { prisma } from '../../util/prisma';
import SlashCommand from '../../command';
import { getBoardTextLabel, noAuthResponse, sortBoards, truncate } from '../../util';
import { createQueryPrompt } from '../../util/prompt';
import { getMember } from '../../util/api';
import { ActionType, createAction } from '../../util/actions';
import fuzzy from 'fuzzy';

export default class SwitchCommand extends SlashCommand {
  constructor(creator: SlashCreator) {
    super(creator, {
      name: 'switch',
      description: 'Switch your board context to interact with board elements.',
      options: [{
        type: CommandOptionType.STRING,
        name: 'board',
        description: 'The board to switch to.',
        autocomplete: true,
        required: true
      }]
    });
  }

  async autocomplete(ctx: AutocompleteContext) {
    const value = ctx.options.board;
    const userData = await prisma.user.findUnique({
      where: { userID: ctx.user.id }
    });

    if (!userData || !userData.trelloToken) return [];

    try {
      const member = await getMember(userData.trelloToken, userData.trelloID);
      const boards = sortBoards(member.boards.filter(b => !b.closed));

      if (!value) return boards
        .map((b) => ({ name: getBoardTextLabel(b), value: b.id }))
        .slice(0, 25);

      const result = fuzzy.filter(value, boards, {
        extract: (board) => board.name
      });
      return result
        .map((res) => ({ name: getBoardTextLabel(res.original), value: res.original.id }))
        .slice(0, 25);
    } catch (e) {
      this.onAutocompleteError(e, ctx)
      return [];
    }
  }

  async run(ctx: CommandContext) {
    const userData = await prisma.user.findUnique({
      where: { userID: ctx.user.id }
    });

    if (!userData || !userData.trelloToken) return noAuthResponse;

    const member = await getMember(userData.trelloToken, userData.trelloID);

    if (ctx.options.board) {
      const board = member.boards.find(b => b.id === ctx.options.board || b.shortLink === ctx.options.board);
      if (board) {
        await prisma.user.update({
          where: { userID: ctx.user.id },
          data: { currentBoard: board.id }
        });

        return `Switched to the "${truncate(board.name, 100)}" board.`;
      }
    }

    const boards = member.boards.filter(b => !b.closed);
    if (!boards.length) return 'You have no boards to switch to.';

    const action = await createAction(ActionType.USER_SWITCH, ctx.user.id);
    await ctx.defer();
    await ctx.fetch();
    return await createQueryPrompt(
      {
        content: 'Select a board to switch to.',
        placeholder: `Select a board... (${boards.length.toLocaleString()})`,
        values: boards,
        display: boards.map(b => ({
          label: truncate(b.name, 100),
          description: [
            b.starred ? 'Starred' : '',
            b.subscribed ? 'Watched' : '',
          ].filter(v => !!v).join(' & '),
          value: b.id
        })),
        action
      },
      ctx.messageID!
    );
  }
}
