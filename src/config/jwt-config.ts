import jwt from 'jsonwebtoken';

export type JWTPayload = {
  id: string;
  email: string;
  role: string;
  token_version: number;
};

export default class JWTConfig {
  static sign(user_id: string, email: string, role: string, token_version: number) {
    return jwt.sign({ id: user_id, email, role, token_version }, process.env.JWT_SECRET_KEY, {
      expiresIn: '7d',
    });
  }

  static refresh(user_id: string, email: string, role: string, token_version: number) {
    return jwt.sign({ id: user_id, email, role, token_version }, process.env.JWT_SECRET_REFRESH, {
      expiresIn: '30d',
    });
  }

  static verify(token: string) {
    return jwt.verify(token, process.env.JWT_SECRET_KEY) as unknown as JWTPayload;
  }

  static verifyRefresh(token: string) {
    return jwt.verify(token, process.env.JWT_SECRET_REFRESH) as unknown as JWTPayload;
  }
}
