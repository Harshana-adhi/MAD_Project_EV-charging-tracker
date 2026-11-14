import { withTx } from '../../core/db';
import { AppError } from '../../core/errors';
import { credit } from '../../core/credit.service';

const TEST_CARD = '4242424242424242';
const DECLINED_CARD = '4000000000000002';

export function getMyWallet(userId: string) {
  return credit.getWallet(userId);
}

export async function topUpWithCard(userId: string, input: { amount: number; cardNumber: string }) {
  if (input.cardNumber === DECLINED_CARD) throw new AppError('CARD_DECLINED', 402);
  if (input.cardNumber !== TEST_CARD) throw new AppError('VALIDATION_ERROR', 400, 'Use a test card');

  await withTx(async (tx) => {
    const request = await tx.topupRequest.create({
      data: { userId, amount: input.amount, method: 'card', status: 'approved' },
    });
    await credit.credit(tx, {
      userId,
      amount: input.amount,
      type: 'topup',
      refType: 'topup',
      refId: request.id,
      note: 'Card top-up',
    });
  });

  await credit.emitWalletUpdates([userId]);
  return credit.getWallet(userId);
}
