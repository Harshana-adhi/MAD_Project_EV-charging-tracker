import { USE_MOCKS } from '@/lib/config';
import * as real from './api';
import * as mock from './api.mock';

const api = USE_MOCKS ? mock : real;

export const { listReviews, addReview } = api;
