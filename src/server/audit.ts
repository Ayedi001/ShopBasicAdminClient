import { prisma, type Tx } from "./db";
import type { SessionUser } from "./auth/session";
import { logger } from "./logger";

/** Records a sensitive administrative operation. Never throws. */
export async function audit(
  user: Pick<SessionUser, "id" | "fullName"> | null,
  action: string,
  entity: string,
  entityId?: string | null,
  details?: Record<string, unknown>,
  tx: Tx = prisma,
) {
  try {
    await tx.auditLog.create({
      data: {
        userId: user?.id ?? null,
        userName: user?.fullName ?? "system",
        action,
        entity,
        entityId: entityId ?? null,
        details: details ? JSON.stringify(details).slice(0, 8000) : null,
      },
    });
  } catch (e) {
    logger.error("audit log failed", { action, entity, error: e });
  }
}
