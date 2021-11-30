import { setGuildSetting, SettingsKey } from "@functions";
import { CategoryChannel, CommandInteraction, Constants } from "discord.js";
import { Discord, Slash, SlashGroup, SlashOption } from "discordx";

@Discord()
@SlashGroup("config")
export abstract class ConfigMainSectionCommand {
  @Slash("main-section")
  private async execute(
    @SlashOption("channel", {
      required: true,
      type: "CHANNEL",
      channelTypes: [Constants.ChannelTypes.GUILD_CATEGORY],
    })
    channel: CategoryChannel,
    interaction: CommandInteraction
  ): Promise<void> {
    await setGuildSetting(
      interaction.guildId,
      SettingsKey.MainSection,
      channel.id
    );

    await interaction.reply({
      content: `Updated the main section to ${channel.name}!`,
      ephemeral: true,
    });
  }
}