import { log as logtail } from "@logtail/next";

const betterStackConfigured = Boolean(
  (process.env.BETTER_STACK_SOURCE_TOKEN ||
    process.env.NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN ||
    process.env.LOGTAIL_SOURCE_TOKEN ||
    process.env.NEXT_PUBLIC_LOGTAIL_SOURCE_TOKEN) &&
    (process.env.BETTER_STACK_INGESTING_URL ||
      process.env.NEXT_PUBLIC_BETTER_STACK_INGESTING_URL ||
      process.env.LOGTAIL_URL ||
      process.env.NEXT_PUBLIC_LOGTAIL_URL),
);

export const log = process.env.NODE_ENV === "production" && betterStackConfigured ? logtail : console;
