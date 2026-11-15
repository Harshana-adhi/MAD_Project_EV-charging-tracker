import { USE_MOCKS } from '@/lib/config';
import * as real from './api';
import * as mock from './api.mock';

export const api = USE_MOCKS ? mock : real;
