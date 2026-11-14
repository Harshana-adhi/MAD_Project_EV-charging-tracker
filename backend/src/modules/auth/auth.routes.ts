import { Router } from 'express';
import { requireAuth } from '../../core/auth.middleware';
import { validate } from '../../core/validate';
import { asyncHandler } from '../../core/errors';
import { registerSchema, loginSchema } from './auth.schema';
import * as controller from './auth.controller';

export const router = Router();

router.post('/register', validate({ body: registerSchema }), asyncHandler(controller.register));
router.post('/login', validate({ body: loginSchema }), asyncHandler(controller.login));
router.get('/me', requireAuth, asyncHandler(controller.me));
