import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const PERMISSIONS = [
  { key: 'analytics:read', label: 'View Analytics & Dashboard', module: 'Operations' },
  { key: 'orders:read', label: 'View Orders & Kitchen Board', module: 'Orders' },
  { key: 'orders:write', label: 'Manage Orders & Update Statuses', module: 'Orders' },
  { key: 'catalog:read', label: 'View Products & Categories', module: 'Catalog' },
  { key: 'catalog:write', label: 'Create & Edit Products & Categories', module: 'Catalog' },
  { key: 'options:read', label: 'View Options & Modifiers', module: 'Options' },
  { key: 'options:write', label: 'Manage Option Groups & Values', module: 'Options' },
  { key: 'zones:read', label: 'View Delivery Zones', module: 'Logistics' },
  { key: 'zones:write', label: 'Manage Delivery Zones & Fees', module: 'Logistics' },
  { key: 'promos:read', label: 'View Promo Codes', module: 'Marketing' },
  { key: 'promos:write', label: 'Manage Promo Codes & Discounts', module: 'Marketing' },
  { key: 'roles:read', label: 'View Roles & Permissions', module: 'Security' },
  { key: 'roles:create', label: 'Create New Roles (Admin & Super Admin)', module: 'Security' },
  { key: 'roles:edit', label: 'Edit Roles (Super Admin Only)', module: 'Security' },
  { key: 'roles:delete', label: 'Delete Roles (Super Admin Only)', module: 'Security' },
] as const;

export const ALL_PERMISSIONS = PERMISSIONS.map((p) => p.key);

export const ADMIN_PERMISSIONS = [
  'analytics:read',
  'orders:read',
  'orders:write',
  'catalog:read',
  'catalog:write',
  'options:read',
  'options:write',
  'zones:read',
  'zones:write',
  'promos:read',
  'promos:write',
  'roles:read',
  'roles:create',
];

@Injectable()
export class RolesService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaultRoles();
  }

  async seedDefaultRoles() {
    // 1. Super Admin
    let superAdmin = await this.prisma.role.findUnique({ where: { slug: 'super_admin' } });
    if (!superAdmin) {
      superAdmin = await this.prisma.role.create({
        data: {
          name: 'Super Admin',
          slug: 'super_admin',
          description:
            'Top-level administrator with unrestricted access to all operations, revenue, catalog, settings, and role management.',
          permissions: ALL_PERMISSIONS,
          isSystem: true,
        },
      });
    }

    // 2. Admin
    const admin = await this.prisma.role.findUnique({ where: { slug: 'admin' } });
    if (!admin) {
      await this.prisma.role.create({
        data: {
          name: 'Admin',
          slug: 'admin',
          description:
            'Operational administrator. Can manage orders, catalog, zones, promos, and create new roles. Cannot edit or delete existing roles.',
          permissions: ADMIN_PERMISSIONS,
          isSystem: true,
        },
      });
    }

    // 3. Ensure master admin user is linked to super_admin role
    const masterAdmin = await this.prisma.adminUser.findFirst({
      where: { roleId: null },
    });
    if (masterAdmin && superAdmin) {
      await this.prisma.adminUser.update({
        where: { id: masterAdmin.id },
        data: { roleId: superAdmin.id },
      });
    }
  }

  async list() {
    const roles = await this.prisma.role.findMany({
      orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    return {
      roles,
      availablePermissions: PERMISSIONS,
    };
  }

  async byId(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true } },
      },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async create(
    user: { role?: string },
    data: {
      name: string;
      description?: string;
      permissions: string[];
    },
  ) {
    const isSuperAdmin = user.role === 'super_admin';
    const isAdmin = user.role === 'admin';

    if (!isSuperAdmin && !isAdmin) {
      throw new ForbiddenException('You do not have permission to create roles');
    }

    const name = data.name?.trim();
    if (!name) throw new BadRequestException('Role name is required');

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    if (slug === 'super_admin' || slug === 'admin') {
      throw new BadRequestException('Reserved system role name');
    }

    const existing = await this.prisma.role.findFirst({
      where: { OR: [{ slug }, { name }] },
    });
    if (existing) throw new BadRequestException('Role with this name already exists');

    // Admin cannot grant permissions they don't have
    let assignedPermissions = data.permissions || [];
    if (!isSuperAdmin) {
      assignedPermissions = assignedPermissions.filter((p) =>
        ADMIN_PERMISSIONS.includes(p),
      );
    }

    return this.prisma.role.create({
      data: {
        name,
        slug,
        description: data.description?.trim() || null,
        permissions: assignedPermissions,
        isSystem: false,
      },
    });
  }

  async update(
    user: { role?: string },
    id: string,
    data: {
      name?: string;
      description?: string;
      permissions?: string[];
    },
  ) {
    if (user.role !== 'super_admin') {
      throw new ForbiddenException('Only Super Admin can edit existing roles');
    }

    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');

    const updateData: {
      name?: string;
      description?: string | null;
      permissions?: string[];
    } = {};

    if (data.name && !role.isSystem) {
      updateData.name = data.name.trim();
    }
    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || null;
    }
    if (data.permissions && !role.isSystem) {
      updateData.permissions = data.permissions;
    } else if (data.permissions && role.slug === 'admin') {
      // Allow Super Admin to adjust Admin's permissions if desired
      updateData.permissions = data.permissions;
    }

    return this.prisma.role.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(user: { role?: string }, id: string) {
    if (user.role !== 'super_admin') {
      throw new ForbiddenException('Only Super Admin can delete roles');
    }

    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) {
      throw new BadRequestException('System roles (Super Admin and Admin) cannot be deleted');
    }
    if (role._count.users > 0) {
      throw new BadRequestException(
        `Cannot delete role '${role.name}' because ${role._count.users} user(s) are currently assigned to it`,
      );
    }

    await this.prisma.role.delete({ where: { id } });
    return { ok: true, message: `Role '${role.name}' deleted successfully` };
  }
}

