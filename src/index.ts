import "reflect-metadata";

import "dotenv/config";
import "module-alias/register";

import { Bot } from "./struct/Bot";
import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";
import type { Event, Command } from "@struct"; // eslint-disable-line no-duplicate-imports

import readdirp from "readdirp";

import { container } from "tsyringe";
import { kClient, kCommands, kPrisma, kRaids, kRedis } from "./tokens";

import Redis from "ioredis";

const client = new Bot();
container.register(kClient, { useValue: client });

const commands = new Map<string, Command>();

async function init() {
  const redis = new Redis(process.env.REDIS_HOST);
  container.register(kRedis, { useValue: redis });

  const prisma = new PrismaClient();
  await prisma.$connect();

  container.register(kPrisma, { useValue: prisma });

  const { Raids } = await import("@struct");
  container.register(kRaids, {
    useValue: new Raids(),
  });

  for await (const entry of readdirp("./events")) {
    const event: Event = new (await import(entry.fullPath)).default();

    logger.info(`Registering event: ${event.name}`);

    client.on(event.name, (...args: unknown[]) => event.execute(...args));
  }

  for await (const entry of readdirp("./commands")) {
    const cmd: Command = new (await import(entry.fullPath)).default(); // eslint-disable-line prefer-const

    if (commands.has(cmd.name)) {
      Array.prototype.push.apply(
        cmd.options,
        commands.get(cmd.name)?.options ?? []
      );
    } else {
      logger.info(`Registering command: ${cmd.name}`);
    }
    commands.set(cmd.name, cmd);
  }
  container.register(kCommands, { useValue: commands });

  await client.login(process.env.DISCORD_TOKEN);
}

void init();
