import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { prisma } from '../prisma';
import { asyncHandler, ApiError } from '../http';
import { authenticate } from '../middleware/auth';
import { hasPermission, PermissionKey } from '../rbac/permissions';
import { writeAudit } from '../audit';

// Where uploaded files live on disk (gitignored). Metadata is in the DB.
const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads');
fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

// Which permission is needed to attach/view docs for a given entity type.
const VIEW_PERMISSION: Record<string, PermissionKey> = {
  order: 'outbound:view',
  receipt: 'inbound:view',
  inventory: 'inventory:view',
  customer: 'customers:view',
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
});

export const attachmentsRouter = Router();
attachmentsRouter.use(authenticate);

function requireEntityView(req: { auth?: { permissions: string[] } }, entityType: string) {
  const perm = VIEW_PERMISSION[entityType];
  if (!perm) throw new ApiError(400, `Unsupported entity type: ${entityType}`);
  if (!hasPermission(req.auth!.permissions, perm)) throw new ApiError(403, `Missing required permission: ${perm}`);
}

attachmentsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { entityType, entityId } = req.query as Record<string, string | undefined>;
    if (!entityType || !entityId) throw new ApiError(400, 'entityType and entityId are required');
    requireEntityView(req, entityType);
    const items = await prisma.attachment.findMany({
      where: { tenantId: req.auth!.tenantId, entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(
      items.map((a) => ({
        id: a.id,
        originalName: a.originalName,
        mimeType: a.mimeType,
        size: a.size,
        uploadedBy: a.uploadedBy,
        createdAt: a.createdAt,
      })),
    );
  }),
);

attachmentsRouter.post(
  '/',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const { entityType, entityId } = req.body as { entityType?: string; entityId?: string };
    if (!entityType || !entityId) throw new ApiError(400, 'entityType and entityId are required');
    requireEntityView(req, entityType);
    const file = req.file;
    if (!file) throw new ApiError(400, 'A file is required');

    const dir = path.join(UPLOAD_ROOT, req.auth!.tenantId);
    fs.mkdirSync(dir, { recursive: true });
    const storedName = `${randomUUID()}${path.extname(file.originalname)}`;
    fs.writeFileSync(path.join(dir, storedName), file.buffer);

    const attachment = await prisma.attachment.create({
      data: {
        tenantId: req.auth!.tenantId,
        entityType,
        entityId,
        filename: storedName,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        uploadedBy: req.auth!.email,
      },
    });
    await writeAudit(req, { action: 'attachment.upload', entity: entityType, entityId, after: { name: file.originalname, size: file.size } });
    res.status(201).json({ id: attachment.id, originalName: attachment.originalName, size: attachment.size });
  }),
);

attachmentsRouter.get(
  '/:id/download',
  asyncHandler(async (req, res) => {
    const attachment = await prisma.attachment.findFirst({ where: { id: req.params.id, tenantId: req.auth!.tenantId } });
    if (!attachment) throw new ApiError(404, 'Attachment not found');
    requireEntityView(req, attachment.entityType);
    const filePath = path.join(UPLOAD_ROOT, attachment.tenantId, attachment.filename);
    if (!fs.existsSync(filePath)) throw new ApiError(404, 'File no longer on disk');
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${attachment.originalName.replace(/"/g, '')}"`);
    fs.createReadStream(filePath).pipe(res);
  }),
);

attachmentsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const attachment = await prisma.attachment.findFirst({ where: { id: req.params.id, tenantId: req.auth!.tenantId } });
    if (!attachment) throw new ApiError(404, 'Attachment not found');
    requireEntityView(req, attachment.entityType);
    const filePath = path.join(UPLOAD_ROOT, attachment.tenantId, attachment.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await prisma.attachment.delete({ where: { id: attachment.id } });
    await writeAudit(req, { action: 'attachment.delete', entity: attachment.entityType, entityId: attachment.entityId });
    res.json({ ok: true });
  }),
);
