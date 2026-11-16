import { Prisma } from '@prisma/client';
import { prisma } from '../../core/db';
import { AppError } from '../../core/errors';
import { broadcast } from '../../core/socket';

const reviewFields = {
  id: true,
  stationId: true,
  rating: true,
  comment: true,
  createdAt: true,
  customer: { select: { fullName: true } },
} satisfies Prisma.ReviewSelect;

type ReviewRow = Prisma.ReviewGetPayload<{ select: typeof reviewFields }>;

function toReview({ customer, ...review }: ReviewRow) {
  const names = customer.fullName.trim().split(/\s+/);
  const lastName = names.length > 1 ? names[names.length - 1] : undefined;
  const customerName = lastName ? `${names[0]} ${lastName[0]}.` : names[0];
  return { ...review, customerName };
}

export async function listReviews(stationId: string) {
  const station = await prisma.station.findFirst({
    where: { id: stationId, status: 'approved' },
    select: {
      reviews: {
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: reviewFields,
      },
    },
  });

  if (!station) throw new AppError('NOT_FOUND', 404);
  return station.reviews.map(toReview);
}

type ReviewInput = { sessionId: string; rating: number; comment?: string };

export async function addReview(customerId: string, input: ReviewInput) {
  const session = await prisma.session.findUnique({
    where: { id: input.sessionId },
    select: { customerId: true, stationId: true, status: true },
  });
  if (!session) throw new AppError('SESSION_NOT_FOUND', 404);
  if (session.customerId !== customerId || session.status !== 'completed') {
    throw new AppError('NOT_ALLOWED', 403);
  }

  try {
    const review = await prisma.review.create({
      data: {
        customerId,
        sessionId: input.sessionId,
        stationId: session.stationId,
        rating: input.rating,
        comment: input.comment?.trim() || null,
      },
      select: reviewFields,
    });
    broadcast('station:changed', { stationId: session.stationId, status: 'reviews' });
    return toReview(review);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError('ALREADY_REVIEWED', 409);
    }
    throw error;
  }
}
