import { codeBlock } from '@discordjs/builders';
import { Stopwatch } from '@sapphire/stopwatch';

import {
	EmbedBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	type ChatInputCommandInteraction,
	type GuildMember,
} from 'discord.js';

import { nanoid } from 'nanoid';

import type { CommandEntity } from '#components/CommandEntity';
import { CommandManager } from '#components/CommandManager';

import { paginate } from '#functions/paginate';
import { parse } from '#functions/parse/parse';
import { generateActionRows } from '#util/components';

const clean = (str: string) => str.replace(/[^A-Za-z]/g, '').toLowerCase();

function getNames(arr: string[]): string[] {
	const names: string[] = [];

	for (const name of arr) {
		if (name.includes('|')) {
			const split = name.split('|');
			names.push(...getNames(split).map((name) => clean(name)));
		} else {
			names.push(clean(name));
		}
	}

	return names;
}

export default class implements CommandEntity {
	public name = 'commands:parse';
	public parent = CommandManager;

	public async run(interaction: ChatInputCommandInteraction<'cached'>) {
		const timer = new Stopwatch();

		const m = await interaction.deferReply({ fetchReply: true });
		const attachment = interaction.options.getAttachment('screenshot', true);
		const voiceChannel = interaction.options.getChannel('voice_channel', false) ?? interaction.member.voice.channel;

		await interaction.editReply('Starting parse.');

		const url = attachment.url || attachment.proxyURL;
		const res = await parse(url).catch(async (err: Error) => {
			if (err.message === 'Not an image') {
				await interaction.editReply({ content: 'The attachment is not an image.' });
				return undefined;
			}

			if (err.message === 'Headers Timeout Error') {
				await interaction.editReply({ content: 'Timed out.' });
				return undefined;
			}

			await interaction.editReply({
				content: 'Failed to parse screenshot.',
			});
			return undefined;
		});

		if (res) {
			await interaction.editReply('Parsing results.');
			timer.stop();

			const text = res.ParsedResults[0].ParsedText;
			const cleanedText = text.replace(/\r\n/g, ' ');
			const embed = new EmbedBuilder().setFooter({ text: `Took ${timer.toString()}` }).setImage(url);

			if (text) {
				embed.setTitle('Parsed screenshot results').setColor('Green').setDescription(codeBlock(cleanedText));

				const crashersKey = nanoid();
				const crashersButton = new ButtonBuilder()
					.setStyle(ButtonStyle.Primary)
					.setCustomId(crashersKey)
					.setLabel('View crashers');
				await interaction.editReply({
					content: null,
					embeds: [embed],
					components: voiceChannel?.isVoiceBased() ? generateActionRows([crashersButton]) : [],
				});

				const collectedInteraction = await m
					.awaitMessageComponent({
						componentType: ComponentType.Button,
						filter: (i) => i.user.id === interaction.user.id,
						time: 60000 * 5,
					})
					.catch(async () => {
						await m.edit({ components: [] });
						return undefined;
					});

				if (collectedInteraction?.customId === crashersKey && voiceChannel?.isVoiceBased()) {
					await collectedInteraction.deferReply({ ephemeral: true });

					const filter = (m: GuildMember) => m.id !== interaction.user.id || !m.user.bot;

					const guildMembers = interaction.guild.members.cache.filter(filter).map((member) => member.displayName);
					const guildMemberNames = getNames(guildMembers);

					const voiceChannelMembers = voiceChannel.members.filter(filter).map((member) => member.displayName);
					const voiceChannelMemberNames = getNames(voiceChannelMembers);

					const embeds: EmbedBuilder[] = [];

					if (guildMemberNames.length && cleanedText.includes(':')) {
						const names = cleanedText.split(': ')[1];
						const split = names.split(', ');

						const inScreenshotButNotInVoiceChannel = split.filter((name) => !voiceChannelMemberNames.includes(name));
						if (inScreenshotButNotInVoiceChannel.length) {
							embeds.push(
								new EmbedBuilder()
									.setTitle('Players found in screenshot, but not in voice channel (Possible alts)')
									.setDescription(codeBlock(inScreenshotButNotInVoiceChannel.join('\n')))
									.setFooter({ text: 'Not 100% accurate!' })
							);
						}
					}

					if (voiceChannelMemberNames.length && cleanedText.includes(':')) {
						const names = cleanedText.split(': ')[1];
						const split = names.split(', ');

						const inVoiceChannelButNotInScreenshot = voiceChannelMemberNames.filter((name) => !split.includes(name));
						if (inVoiceChannelButNotInScreenshot.length) {
							embeds.push(
								new EmbedBuilder()
									.setTitle('Players in voice channel, but not found in screenshot (Possible alts)')
									.setDescription(codeBlock(inVoiceChannelButNotInScreenshot.join('\n')))
									.setFooter({ text: 'May not be 100% accurate' })
							);
						}
					}

					await paginate(collectedInteraction, embeds);
					return;
				}

				embed.setTitle('Failed to parse screenshot').setColor('DarkRed');
				await interaction.editReply({ embeds: [embed] });
			}
		}
	}
}
