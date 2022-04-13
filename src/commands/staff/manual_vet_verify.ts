import type { ChatInputCommandInteraction } from 'discord.js';
import { inject, injectable } from 'tsyringe';
import { kDatabase } from '../../tokens';
import { VerificationType, verifyMember } from '#functions/verification/verifyMember';
import type { Command } from '#struct/Command';
import { Database } from '#struct/Database';

@injectable()
export default class implements Command {
	public name = 'manual_vet_verify';
	public description = 'Manually veteran verify a member';
	public options = [
		{
			name: 'member',
			description: 'The member to verify',
			required: true,
			type: 6,
		},
	];

	public constructor(@inject(kDatabase) public readonly db: Database) {}

	public async run(interaction: ChatInputCommandInteraction<'cached'>) {
		await interaction.deferReply();

		const { userRole } = await this.db.getSection(interaction.guildId, 'veteran');

		if (!userRole) {
			await interaction.editReply('There is no set role in the database.');
			return;
		}

		const member = interaction.options.getMember('member');
		const role = await interaction.guild.roles.fetch(userRole).catch(() => undefined);

		if (!role) {
			await interaction.editReply(`Could not find role in the server (${userRole}).`);
			return;
		}

		if (member) {
			if (!member.manageable) {
				await interaction.editReply('I cannot add the role to this user.');
				return;
			}
			await verifyMember(member, {
				roleId: role.id,
				type: VerificationType.Veteran,
			});

			await interaction.editReply('Done. If they did not receive the role, please add it manually.');
		}
	}
}
