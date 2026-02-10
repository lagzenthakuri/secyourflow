import { prisma } from "@/lib/prisma";

/**
 * Notify security team members about important events
 */
export async function notifySecurityTeam(
  organizationId: string,
  notification: {
    title: string;
    message: string;
    type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
    link?: string;
  }
) {
  const securityTeam = await prisma.user.findMany({
    where: {
      role: { in: ['IT_OFFICER', 'MAIN_OFFICER', 'ANALYST'] },
      organizationId
    },
    select: { id: true }
  });

  if (securityTeam.length === 0) return 0;

  await prisma.notification.createMany({
    data: securityTeam.map(user => ({
      userId: user.id,
      ...notification
    }))
  });
  
  return securityTeam.length;
}
