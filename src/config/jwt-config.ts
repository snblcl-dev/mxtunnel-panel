import jwt from 'jsonwebtoken';

export default class JWTConfig {
  static sign(user_id: string, email: string, role: string) {
    return jwt.sign({ id: user_id, email, role }, process.env.JWT_SECRET_KEY, {
      expiresIn: '7d',
    });
  }

  static refresh(user_id: string, email: string, role: string) {
    return jwt.sign({ id: user_id, email, role }, process.env.JWT_SECRET_REFRESH, {
      expiresIn: '30d',
    });
  }

  static verify(token: string) {
    return jwt.verify(token, process.env.JWT_SECRET_KEY) as unknown as {
      id: string;
      email: string;
      role: string;
    };
  }

  static verifyRefresh(token: string) {
    return jwt.verify(token, process.env.JWT_SECRET_REFRESH) as unknown as {
      id: string;
      email: string;
      role: string;
    };
  }
}
