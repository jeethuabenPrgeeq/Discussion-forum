import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  role: 'creator' | 'learner';
}

export const toPublicUser = (user: User): PublicUser => ({
  id: user.id,
  email: user.email,
  name: `${user.firstName} ${user.lastName}`.trim(),
  firstName: user.firstName,
  lastName: user.lastName,
  role: user.role === 'CREATOR' ? 'creator' : 'learner',
});

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!user || !ok) throw new UnauthorizedException('Email or password is incorrect');
    const token = await this.jwt.signAsync({ sub: user.id, role: user.role });
    return { user: toPublicUser(user), token };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Account not found');
    return toPublicUser(user);
  }
}