import type { AutocompleteInteraction, ChatInputCommandInteraction } from 'discord.js';

import { injectable, inject } from 'tsyringe';
import { kRaids } from '../tokens';
import { guilds } from '../util/mongo';
import { Afkcheck } from '#struct/Afkcheck';

import type { Command } from '#struct/Command';
import type { RaidManager } from '#struct/RaidManager';

@injectable()
export default class implements Command {
	public name = 'afkcheck';
	public description = 'start an afkcheck';
	public options = [
		{
			type: 3,
			name: 'voice_channel',
			description: 'voice channel to use',
			autocomplete: true,
			required: true,
		},
		{
			name: 'dungeon',
			description: 'the dungeon to run',
			type: 3,
			choices: [
				{ name: 'Oryx Sanctuary', value: 'o3' },
				{ name: 'The Void', value: 'void' },
				{ name: 'Fullskip Void', value: 'fsv' },
				{ name: 'The Shatters', value: 'shatters' },
				{ name: 'Cultist Hideout', value: 'cult' },
				{ name: 'The Nest', value: 'nest' },
				{ name: 'Fungal Cavern', value: 'fungal' },
			],
			required: true,
		},
	];

	public constructor(@inject(kRaids) public readonly manager: RaidManager) {}

	public async run(interaction: ChatInputCommandInteraction<'cached'>) {
		await interaction.deferReply();

		if (this.manager.afkchecks.has(`${interaction.guildId}-${interaction.member.id}`)) {
			await interaction.editReply('You already have an active afkcheck, abort to start another.');
			return;
		}

		const voiceChannelId = interaction.options.getString('voice_channel', true);
		const dungeon = this.manager.dungeonCache.get(interaction.options.getString('dungeon', true))!;

		const afkcheck = new Afkcheck({
			dungeon,
			guildId: interaction.guildId,
			memberId: interaction.member.id,

			textChannelId: interaction.channelId,
			voiceChannelId,
		});

		await interaction.deleteReply();
		await afkcheck.begin();
	}

	public async autocomplete(interaction: AutocompleteInteraction<'cached'>) {
		const guild = await guilds.findOne({ guild_id: interaction.guildId });

		const { channel } = interaction;
		const parentId = channel?.parentId;

		const section = parentId === guild?.main.category_id ? 'main' : 'veteran';
		const channelIds = guild![section].voice_channel_ids;

		const response = [];
		for (const id of channelIds) {
			const channel = await interaction.guild.channels.fetch(id, { cache: true }).catch(() => undefined);
			if (channel?.isVoice()) response.push({ name: channel.name, value: id });
		}

		await interaction.respond(response);
	}
}
