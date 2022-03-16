import type { ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../struct/Command';

import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

export default class implements Command {
	public name = 'verify';
	public description = 'verify yourself';
	public options = [];

	public async run(interaction: ChatInputCommandInteraction) {
		if (!interaction.inCachedGuild()) return;

		const modal = new ModalBuilder()
			.setTitle(`${interaction.guild.name} Verification`)
			.setCustomId('verification_modal');

		const nameForm = new TextInputBuilder()
			.setCustomId('name')
			.setLabel('What is your ingame name?')
			.setStyle(TextInputStyle.Short);

		modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(nameForm));

		await interaction.showModal(modal);
	}
}
