import { Command, command, CommandContext } from "@lib";
import { ApplicationCommandOptionType } from "discord-api-types/v9";
import { MessageEmbed } from "discord.js";
import { dungeons } from "../../../dungeons";

console.log(
  "dungeons",
  dungeons.map((c) => ({
    name: c["name"],
    description: c["full-name"],
    type: ApplicationCommandOptionType.Subcommand,
  }))
);

@command({
  name: "headcount",
  description: "headcount for a raid.",
  options: dungeons.map((c) => ({
    name: c["name"],
    description: c["full-name"],
    type: ApplicationCommandOptionType.Subcommand,
  })),
})
export default class extends Command {
  public async exec(ctx: CommandContext) {
    await ctx.interaction.deferReply();
    const subcommand = ctx.interaction.options.getSubcommand();

    const dungeon = dungeons.find((c) => c.name === subcommand);
    if (!dungeon)
      return await ctx.interaction.editReply("dungeon data not found.");

    const { thumbnail, color } = dungeon;

    const description: string[] = [
      `React with ${dungeon.reacts[0].emote} to join.`,
    ];

    const embed = new MessageEmbed()
      .setColor(color ?? 0)
      .setThumbnail(thumbnail)
      .setTitle(`\`${dungeon["full-name"]}\``)
      .setDescription(description.join("\n"));
    await ctx.interaction.editReply({ content: "@here", embeds: [embed] });
  }
}
