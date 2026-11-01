import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

export type AuthRole = 'super_admin' | 'admin' | 'customer' | (string & {});

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private async sign(payload: {
    sub: string;
    email: string;
    name: string;
    role: AuthRole;
  }) {
    return this.jwt.signAsync(payload);
  }

  async adminLogin(email: string, password: string) {
    const user = await this.prisma.adminUser.findUnique({
      where: { email },
      include: { role: true },
    });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const roleSlug = (user.role?.slug || 'super_admin') as AuthRole;
    const roleName = user.role?.name || 'Super Admin';
    const permissions = user.role?.permissions || [];

    const accessToken = await this.sign({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: roleSlug,
    });
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: roleSlug,
        roleName,
        permissions,
      },
    };
  }

  async adminMe(userId: string) {
    const user = await this.prisma.adminUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: {
          select: {
            id: true,
            name: true,
            slug: true,
            permissions: true,
          },
        },
      },
    });
    if (!user) throw new UnauthorizedException();
    const roleSlug = (user.role?.slug || 'super_admin') as AuthRole;
    const roleName = user.role?.name || 'Super Admin';
    const permissions = user.role?.permissions || [];

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: roleSlug,
      roleName,
      permissions,
    };
  }

  async customerSignup(input: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) {
    const email = input.email.trim().toLowerCase();
    const existing = await this.prisma.customer.findUnique({ where: { email } });
    if (existing) throw new ConflictException('An account with this email already exists');
    if (input.password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const customer = await this.prisma.customer.create({
      data: {
        name: input.name.trim(),
        email,
        phone: input.phone?.trim() || null,
        passwordHash,
      },
    });

    const accessToken = await this.sign({
      sub: customer.id,
      email: customer.email,
      name: customer.name,
      role: 'customer',
    });

    return {
      accessToken,
      user: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        role: 'customer' as const,
      },
    };
  }

  async customerLogin(email: string, password: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!customer || !(await bcrypt.compare(password, customer.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const accessToken = await this.sign({
      sub: customer.id,
      email: customer.email,
      name: customer.name,
      role: 'customer',
    });
    return {
      accessToken,
      user: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        role: 'customer' as const,
      },
    };
  }

  async customerMe(userId: string) {
    const user = await this.prisma.customer.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, phone: true },
    });
    if (!user) throw new UnauthorizedException();
    return { ...user, role: 'customer' as const };
  }

  async updateCustomerProfile(
    userId: string,
    data: { name?: string; phone?: string },
  ) {
    const user = await this.prisma.customer.update({
      where: { id: userId },
      data: {
        name: data.name?.trim(),
        phone: data.phone?.trim() || null,
      },
      select: { id: true, email: true, name: true, phone: true },
    });
    return { ...user, role: 'customer' as const };
  }

  /** Kept for backward-compatible admin panel login path */
  login(email: string, password: string) {
    return this.adminLogin(email, password);
  }

  me(userId: string) {
    return this.adminMe(userId);
  }
}
