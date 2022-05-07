import { logger } from '../../util/logger';
import { ModLogAction, type ModLogCase } from './createCase';
import type { GuildMember } from 'discord.js';

export async function takeAction(case_: ModLogCase) {
	const { moderator, target, deleteMessageDays } = case_;
	const { guild } = moderator;

	try {
		switch (case_.action) {
			case ModLogAction.Ban:
				await guild.bans.create(target, { deleteMessageDays, reason: case_.reason! });
				break;
			case ModLogAction.Unban:
				await guild.members.unban(target.id);
				break;
			case ModLogAction.Kick:
				await guild.members.kick(target, case_.reason!);
				break;
			case ModLogAction.Suspend:
				break;
			case ModLogAction.Unsuspend:
				break;
			case ModLogAction.Warn:
				break;
			case ModLogAction.Timeout:
				await (target as GuildMember).timeout(case_.duration!);
				break;
		}
	} catch (e) {
		const error = e as Error;
		logger.error(error, error.message);
	}
}
