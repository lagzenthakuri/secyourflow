import { Prisma } from "@repo/database";
import { prisma } from "@/lib/prisma";
import type {
  TotpUserStore,
  TotpUserUpdate,
} from "@/lib/security/totp-service";

const TOTP_USER_SELECT = {
  id: true,
  email: true,
  totpEnabled: true,
  totpSecretEnc: true,
  totpVerifiedAt: true,
  totpRecoveryCodesHash: true,
  totpLastUsedStep: true,
} as const;

function toPrismaUpdateInput(update: TotpUserUpdate): Prisma.UserUpdateInput {
  const data: Prisma.UserUpdateInput = {};

  if (Object.hasOwn(update, "totpEnabled")) {
    data.totpEnabled = update.totpEnabled;
  }

  if (Object.hasOwn(update, "totpSecretEnc")) {
    data.totpSecretEnc = update.totpSecretEnc;
  }

  if (Object.hasOwn(update, "totpVerifiedAt")) {
    data.totpVerifiedAt = update.totpVerifiedAt;
  }

  if (Object.hasOwn(update, "totpRecoveryCodesHash")) {
    if (update.totpRecoveryCodesHash === null) {
      data.totpRecoveryCodesHash = Prisma.DbNull;
    } else if (update.totpRecoveryCodesHash !== undefined) {
      data.totpRecoveryCodesHash =
        update.totpRecoveryCodesHash as Prisma.InputJsonValue;
    }
  }

  if (Object.hasOwn(update, "totpLastUsedStep")) {
    data.totpLastUsedStep = update.totpLastUsedStep;
  }

  return data;
}

export const prismaTotpStore: TotpUserStore = {
  async getById(userId) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: TOTP_USER_SELECT,
    });
  },
  async updateById(userId, data) {
    return prisma.user.update({
      where: { id: userId },
      data: toPrismaUpdateInput(data),
      select: TOTP_USER_SELECT,
    });
  },
};
