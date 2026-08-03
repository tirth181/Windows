import jwt from 'jsonwebtoken';
import { env } from '../env';

export interface JwtPayload {
  sub: string; // user id
  tenantId: string;
  email: string;
}

export function signToken(payload: JwtPayload): string {
  const options: jwt.SignOptions = { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
