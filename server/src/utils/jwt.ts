import jwt from 'jsonwebtoken';

export type Role = 'USER' | 'LABEL' | 'ADMIN';

export interface JwtPayload {
  id: number;
  role: Role;
}

const SECRET = process.env.JWT_SECRET!;

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}