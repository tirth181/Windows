import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { ensureSeeded } from '../seed';
import { prisma } from '../prisma';

const app = createApp();

async function login(email: string, password = 'Password123!') {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res;
}

beforeAll(async () => {
  // Requires migrations to have been applied (npm run db:deploy).
  await ensureSeeded();
});

describe('AetherWMS API', () => {
  it('health check responds', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('rejects bad credentials', async () => {
    const res = await login('admin@abc.com', 'wrong-password');
    expect(res.status).toBe(401);
  });

  it('logs in an administrator and returns a token', async () => {
    const res = await login('admin@abc.com');
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe('Administrator');
  });

  it('enforces RBAC: associate cannot view audit logs', async () => {
    const { body } = await login('john@abc.com');
    const res = await request(app).get('/api/audit/logs').set('Authorization', `Bearer ${body.token}`);
    expect(res.status).toBe(403);
  });

  it('AI assistant denies pricing to a warehouse associate', async () => {
    const { body } = await login('john@abc.com');
    const res = await request(app)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${body.token}`)
      .send({ question: 'Show me customer pricing.' });
    expect(res.status).toBe(200);
    expect(res.body.denied).toBe(true);
    expect(res.body.answer).toMatch(/permission/i);
  });

  it('AI assistant answers inventory questions for an associate', async () => {
    const { body } = await login('john@abc.com');
    const res = await request(app)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${body.token}`)
      .send({ question: 'How much inventory is available?' });
    expect(res.status).toBe(200);
    expect(res.body.denied).toBeFalsy();
    expect(res.body.data).toBeTruthy();
  });

  it('enforces tenant isolation: ABC token cannot see Globex inventory', async () => {
    const abc = await login('admin@abc.com');
    const abcItems = await request(app).get('/api/inventory').set('Authorization', `Bearer ${abc.body.token}`);
    const abcTenantId = abc.body.user.tenantId;
    expect(abcItems.status).toBe(200);
    expect(abcItems.body.length).toBeGreaterThan(0);
    for (const item of abcItems.body) {
      expect(item.tenantId).toBe(abcTenantId);
    }

    // Globex has its own, separate inventory set.
    const globex = await login('admin@globex.com');
    expect(globex.body.user.tenantId).not.toBe(abcTenantId);
  });

  it('activity-based billing: executive can view, associate cannot', async () => {
    const exec = await login('exec@abc.com');
    const bill = await request(app).get('/api/billing').set('Authorization', `Bearer ${exec.body.token}`);
    expect(bill.status).toBe(200);
    expect(bill.body.invoices.length).toBeGreaterThan(0);
    expect(bill.body.grandTotal).toBeGreaterThan(0);

    const john = await login('john@abc.com');
    const denied = await request(app).get('/api/billing').set('Authorization', `Bearer ${john.body.token}`);
    expect(denied.status).toBe(403);
  });

  it('document attachments: upload, list, and download on an order', async () => {
    const mgr = await login('manager@abc.com');
    const auth = { Authorization: `Bearer ${mgr.body.token}` };
    const orders = await request(app).get('/api/outbound').set(auth);
    const orderId = orders.body[0].id;

    const uploaded = await request(app)
      .post('/api/attachments')
      .set(auth)
      .field('entityType', 'order')
      .field('entityId', orderId)
      .attach('file', Buffer.from('PACKING LIST — 2 pallets'), 'packing-list.txt');
    expect(uploaded.status).toBe(201);

    const list = await request(app).get(`/api/attachments?entityType=order&entityId=${orderId}`).set(auth);
    expect(list.status).toBe(200);
    expect(list.body.length).toBeGreaterThan(0);

    const dl = await request(app).get(`/api/attachments/${uploaded.body.id}/download`).set(auth);
    expect(dl.status).toBe(200);
    expect(dl.text).toContain('PACKING LIST');
  });

  it('AI understands varied natural language (behind schedule -> delayed)', async () => {
    const { body } = await login('manager@abc.com');
    const res = await request(app)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${body.token}`)
      .send({ question: 'hey, are any orders running behind schedule?' });
    expect(res.status).toBe(200);
    expect(res.body.intent).toBe('delayed');
  });

  it('records login events for security monitoring', async () => {
    await login('admin@abc.com', 'nope');
    const events = await prisma.loginEvent.findMany({ where: { email: 'admin@abc.com', success: false } });
    expect(events.length).toBeGreaterThan(0);
  });
});
