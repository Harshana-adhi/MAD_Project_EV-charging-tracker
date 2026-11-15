import type { Prisma } from '@prisma/client';
import type { AuthUser } from '../../core/auth.middleware';
import { prisma } from '../../core/db';
import { notifyAdmins } from '../../core/notify.service';
import { toCloudinary } from '../../core/upload';

const publicFields = {
  id: true,
  amount: true,
  method: true,
  slipUrl: true,
  status: true,
  reason: true,
  createdAt: true,
} satisfies Prisma.TopupRequestSelect;

type RequestRow = Prisma.TopupRequestGetPayload<{ select: typeof publicFields }>;

function toTopup(row: RequestRow) {
  return { ...row, amount: row.amount.toNumber() };
}

export async function listMyTopups(userId: string) {
  const rows = await prisma.topupRequest.findMany({
    where: { userId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: publicFields,
  });
  return rows.map(toTopup);
}

export async function requestSlipTopUp(user: AuthUser, amount: number, file: Express.Multer.File) {
  const slipUrl = await toCloudinary(file, 'slips');
  const row = await prisma.topupRequest.create({
    data: { userId: user.id, amount, method: 'slip', status: 'pending', slipUrl },
    select: publicFields,
  });

  try {
    await notifyAdmins({
      title: 'New slip top-up',
      body: `LKR ${amount.toLocaleString('en-LK')} from ${user.fullName}`,
      type: 'topup_pending',
      refId: row.id,
    });
  } catch (error) {
    // The request is already saved and visible in the admin queue.
    console.error('Could not notify admins of top-up request', row.id, error);
  }

  return toTopup(row);
}
