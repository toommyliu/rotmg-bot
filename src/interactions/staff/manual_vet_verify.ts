import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export default {
	name: 'manual_vet_verify',
	description: 'Manually veteran verify a member',
	options: [
		{
			name: 'member',
			description: 'The member to verify',
			type: ApplicationCommandOptionType.User,
			required: true,
		},
		{
			name: 'hide',
			description: 'Hides command output to other members',
			type: ApplicationCommandOptionType.Boolean,
			required: false,
		},
	],
} as const;
