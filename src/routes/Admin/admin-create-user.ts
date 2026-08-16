import { z } from 'zod';
import prisma from '../../config/prisma-client';
import { hashPassword } from '../../utils/bcrypt';
import RequireCSRF from '../../middlewares/require-csrf';
import AdminAuthentication from '../../middlewares/admin-authentication';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

const schema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6).optional().or(z.literal('')),
  expiration_date: z.string().optional().or(z.literal('')),
});

export default {
  url: '/admin/users',
  method: 'POST',
  onRequest: [AdminAuthentication],
  preHandler: [RequireCSRF],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'ValidationError', details: parsed.error.issues });
    }

    const { username, email, password, expiration_date } = parsed.data;

    const hashed = password ? await hashPassword(password) : null;
    const expiration = expiration_date ? new Date(expiration_date) : null;

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashed,
        role: 'USER',
        expiration_date: expiration,
      },
    });

    return reply.redirect('/admin/users');
  },
} as RouteOptions;
