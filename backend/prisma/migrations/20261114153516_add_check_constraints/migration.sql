ALTER TABLE "wallets" ADD CONSTRAINT "wallets_non_negative" CHECK (balance >= 0 AND held >= 0 AND held <= balance);
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating_range" CHECK (rating BETWEEN 1 AND 5);
