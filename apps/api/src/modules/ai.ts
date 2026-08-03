import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../http';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { askAssistant, executeAction, PendingAction } from '../ai/assistant';
import { writeAudit } from '../audit';

export const aiRouter = Router();
aiRouter.use(authenticate);

const askSchema = z.object({ question: z.string().min(1) });
aiRouter.post(
  '/ask',
  requirePermission('ai:use'),
  asyncHandler(async (req, res) => {
    const { question } = askSchema.parse(req.body);
    const response = await askAssistant(req.auth!, question);
    await writeAudit(req, { action: 'ai.ask', entity: 'ai', after: { question, denied: response.denied ?? false } });
    res.json(response);
  }),
);

aiRouter.post(
  '/execute',
  requirePermission('ai:actions'),
  asyncHandler(async (req, res) => {
    const action = req.body?.action as PendingAction | undefined;
    if (!action || !action.type) {
      return res.status(400).json({ error: 'A valid action is required' });
    }
    const result = await executeAction(req.auth!, action);
    await writeAudit(req, {
      action: 'ai.execute',
      entity: 'ai',
      entityId: action?.type ?? '',
      after: { action, result },
    });
    res.json(result);
  }),
);
