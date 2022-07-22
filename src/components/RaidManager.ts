// @fs-entity
import { readFile } from 'node:fs/promises';
import { Component, ComponentAPI, Inject, Subscribe } from '@ayanaware/bento';
import Toml from '@iarna/toml';
import { Collection, Events, BaseInteraction } from 'discord.js';
import { Discord } from './Discord';

import type { Raid } from '#functions/raiding/startRaid';
import { logger } from '#util/logger';

export class RaidManager implements Component {
	public name = 'Raid manager';
	public api!: ComponentAPI;

	@Inject(Discord) private readonly discord!: Discord;

	public readonly raids: Collection<string, Raid> = new Collection();
	public readonly dungeons: Map<string, Dungeon> = new Map();
	private readonly emojis: Map<string, string> = new Map();

	public async onVerify() {
		await this.mapEmojis();
		return this.loadDungeonData();
	}

	private async mapEmojis() {
		const file = await readFile('../data/emojis.toml', { encoding: 'utf-8' });

		const file_ = Toml.parse(file);
		for (const emojis of Object.values(file_)) {
			const emojis_ = emojis as Record<string, string>;
			for (const [emojiName, emojiId] of Object.entries(emojis_)) this.emojis.set(emojiName, emojiId);
		}
	}

	private resolveEmoji(emojiName: string): string {
		const emojiId = this.emojis.get(emojiName);

		if (emojiId || emojiName) {
			const guildEmoji =
				this.discord.client.emojis.cache.find((emoji) => emoji.name === emojiName) ??
				this.discord.client.emojis.cache.get(emojiId!);

			if (guildEmoji) {
				return `<:${guildEmoji.name!}:${guildEmoji.id}>`;
			}
		}

		return '';
	}

	private async loadDungeonData() {
		const file = await readFile('../data/dungeons.toml', { encoding: 'utf-8' });
		const file_ = Toml.parse(file);

		for (const [key, dungeon] of Object.entries(file_)) {
			const dungeon_ = dungeon as unknown as Dungeon;

			const portal = this.resolveEmoji(dungeon_.portal);
			const keys = dungeon_.keys.map(({ emoji, max }) => ({
				emoji: this.resolveEmoji(emoji),
				max: max,
			}));
			const main = dungeon_.main.map(({ emoji, max }) => ({
				emoji: this.resolveEmoji(emoji),
				max: max,
			}));

			this.dungeons.set(key, { ...dungeon_, portal, keys, main, color: Number(dungeon_.color) });
		}

		logger.info('Cached dungeon data');
	}

	// TODO: handle control panel interactions
	@Subscribe(Discord, Events.InteractionCreate)
	private handleInteractionCreate(interaction: BaseInteraction) {
		interaction;
		// if (!interaction.inCachedGuild() || !interaction.isButton()) return;
		// const raidKey = this.raids.findKey((raid) => raid.textChannelId === interaction.channelId && raid);
		// if (!raidKey) return;
	}
}

export interface Dungeon {
	name: string;
	portal: string;
	keys: EmojiReaction[];

	main: EmojiReaction[];
	optional?: EmojiReaction[];

	color: number;
	images: string[];
}

export interface EmojiReaction {
	emoji: string;
	max: number;
}
