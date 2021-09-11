import { CommandContext } from "@lib";
import { fetchPlayer } from "@verification";
import {
  GuildMember,
  MessageActionRow,
  MessageComponentInteraction,
  MessageEmbed,
  MessageSelectMenu,
  SelectMenuInteraction,
} from "discord.js";

export enum VerificationStatus {
  // bad
  FAILED = 0,
  INVALID_SETUP = -1,
  MEMBERSHIP_SCREENING = -2,
  PRIVATE = -3,

  // good
  SUCCESSFUL = 1,
  ALREADY_VERIFIED = 2,

  ADDED_ROLE = 4,

  IN_PROGRESS = 3,
}

export async function verifyMember(
  ctx: CommandContext
): Promise<VerificationStatus> {
  const { client, guild, user, channel } = ctx;

  const users = await client.users_db.all();
  const target = users.find((c) => c.ID === user.id);

  const name = ctx.interaction.options.getString("name");

  const role = (await client.guilds_db.get(
    guild!.id,
    "verified_role"
  )) as string;
  return new Promise(async (resolve) => {
    if (!role) return resolve(VerificationStatus.INVALID_SETUP);

    const member = await guild?.members.fetch(user.id);
    if (!member) return resolve(VerificationStatus.FAILED);

    if (member.pending) return resolve(VerificationStatus.MEMBERSHIP_SCREENING);

    if (name) {
      console.log("started with a name");
      if (target?.data.names.includes(name)) {
        target?.data.names.push(name);
        await finish(member, role, target?.data.names);
        return resolve(VerificationStatus.ADDED_ROLE);
      } else {
        const player = await fetchPlayer(name);

        console.log("Here");
        if (!player) return resolve(VerificationStatus.PRIVATE);
        if (target) {
          await client.users_db.push(member.user.id, name, "names");
        } else {
          await client.users_db.set(member.user.id, { names: [] });
          await client.users_db.push(member.user.id, name, "names");

          resolve(await finish(member, role, [name]));
        }
      }
    } else {
      const names: string[] | undefined = target?.data?.names;

      if (names) {
        const menu = new MessageActionRow().addComponents(
          new MessageSelectMenu()
            .setCustomId("select-ign-to-verify")
            .addOptions(names.map((c) => ({ label: c, value: c })))
        );

        const msg = await channel.send({
          embeds: [
            new MessageEmbed()
              .setDescription(
                ["Select a name to verify under.", "You have 1 minute."].join(
                  "\n\n"
                )
              )
              .setColor("BLUE"),
          ],
          components: [menu],
        });

        const filter = (i: MessageComponentInteraction) => {
          i.deferUpdate();
          return i.user.id === member.user.id;
        };

        const interaction = await msg
          .awaitMessageComponent({
            filter,
            componentType: "SELECT_MENU",
            time: 15000,
          })
          .catch(() => {});

        if (!interaction) {
          await msg.delete();
          await ctx.interaction.editReply("Time ran out.");
        } else {
          const { values, customId } = interaction as SelectMenuInteraction;
          if (customId !== "select-ign-to-verify") return;

          const toAdd = [];
          if (member.roles.cache.has(role)) {
            const names = member.nickname?.split(" | ") as string[];
            console.log("names 1", names);
            if (!names || names.length === 0) toAdd.push(values[0]); // no nick
            if (names.length && !names?.includes(values[0]))
              toAdd.push(...names, values[0]);
          } else toAdd.push(values[0]);

          console.log("toAdd", toAdd);
          resolve(await finish(member as GuildMember, role, toAdd));

          await msg.delete();
          return;
        }
      }
    }
  });
}

async function finish(
  member: GuildMember,
  role: string,
  value: string | string[]
): Promise<VerificationStatus> {
  return new Promise(async (resolve, reject) => {
    console.log("names", value);
    try {
      await member.roles.add(role);
      await member.setNickname(
        typeof value === "string" ? value : value.join(" | ")
      );
      resolve(VerificationStatus.SUCCESSFUL);
    } catch (e) {
      reject(VerificationStatus.FAILED);
    }
  });
}
