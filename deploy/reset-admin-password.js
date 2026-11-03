#!/usr/bin/env node
/**
 * BigBites — Emergency Super Admin Password Reset & Account Management Tool
 * 
 * Usage:
 *   node deploy/reset-admin-password.js --list
 *   node deploy/reset-admin-password.js <email> <newPassword>
 * 
 * Examples:
 *   node deploy/reset-admin-password.js admin@bigbites.pk "BigBites@2026!"
 *   node deploy/reset-admin-password.js --list
 */

const fs = require('fs');
const path = require('path');

// 1. Load environment variables from .env or apps/api/.env if DATABASE_URL is not set
function loadEnv() {
  const candidates = [
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '..', 'apps', 'api', '.env'),
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), 'apps', 'api', '.env'),
  ];

  for (const file of candidates) {
    if (fs.existsSync(file)) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx === -1) continue;
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      } catch (e) {
        // ignore read error
      }
    }
  }
}

loadEnv();

if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL environment variable is missing.');
  console.error('Please ensure .env or apps/api/.env exists and contains DATABASE_URL.');
  process.exit(1);
}

// 2. Resolve PrismaClient and bcryptjs from local or api dependencies
function resolveDep(pkgName) {
  try {
    return require(pkgName);
  } catch {
    try {
      const resolved = require.resolve(pkgName, { paths: [process.cwd(), path.join(__dirname, '..', 'apps', 'api')] });
      return require(resolved);
    } catch (e) {
      console.error(`❌ Could not resolve dependency: ${pkgName}`);
      console.error(e.message);
      process.exit(1);
    }
  }
}

const { PrismaClient } = resolveDep('@prisma/client');
const bcrypt = resolveDep('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
===================================================================
🔑 BigBites Admin Account & Password Reset Tool
===================================================================
Usage:
  node deploy/reset-admin-password.js --list
  node deploy/reset-admin-password.js <email> <newPassword>

Examples:
  node deploy/reset-admin-password.js admin@bigbites.pk "BigBites@2026!"
  node deploy/reset-admin-password.js --list
===================================================================
`);
    return;
  }

  if (args[0] === '--list' || args[0] === '-l') {
    console.log('🔍 Fetching all admin users from database...\n');
    const users = await prisma.adminUser.findMany({
      include: { role: true },
      orderBy: { createdAt: 'asc' },
    });

    if (users.length === 0) {
      console.log('⚠️ No admin users found in the database.');
      return;
    }

    console.log('-----------------------------------------------------------------------------------------------------');
    console.log(
      'Email'.padEnd(30) +
      'Name'.padEnd(25) +
      'Role'.padEnd(20) +
      'User ID'
    );
    console.log('-----------------------------------------------------------------------------------------------------');
    for (const u of users) {
      const roleName = u.role?.name || (u.role?.slug === 'super_admin' ? 'Super Admin' : 'No Role');
      console.log(
        u.email.padEnd(30) +
        u.name.padEnd(25) +
        roleName.padEnd(20) +
        u.id
      );
    }
    console.log('-----------------------------------------------------------------------------------------------------\n');
    return;
  }

  const email = (args[0] || '').trim().toLowerCase();
  const newPassword = (args[1] || '').trim();

  if (!email || !email.includes('@')) {
    console.error('❌ Error: A valid email address is required as the first argument.');
    process.exit(1);
  }

  if (!newPassword || newPassword.length < 6) {
    console.error('❌ Error: New password must be at least 6 characters long.');
    process.exit(1);
  }

  // Ensure super_admin role exists
  let superAdminRole = await prisma.role.findUnique({ where: { slug: 'super_admin' } });
  if (!superAdminRole) {
    console.log('ℹ️ super_admin role not found. Creating it now...');
    superAdminRole = await prisma.role.create({
      data: {
        name: 'Super Admin',
        slug: 'super_admin',
        description: 'Top-level administrator with full access to all settings and staff management.',
        permissions: ['*'],
        isSystem: true,
      },
    });
  }

  // Find or create the user
  let user = await prisma.adminUser.findUnique({
    where: { email },
    include: { role: true },
  });

  const passwordHash = await bcrypt.hash(newPassword, 10);

  if (user) {
    user = await prisma.adminUser.update({
      where: { email },
      data: {
        passwordHash,
        roleId: superAdminRole.id, // Ensure user has Super Admin role
      },
      include: { role: true },
    });
    console.log('\n===================================================================');
    console.log('✅ PASSWORD RESET SUCCESSFUL');
    console.log('===================================================================');
    console.log(`User Email : ${user.email}`);
    console.log(`User Name  : ${user.name}`);
    console.log(`Role       : ${user.role?.name || 'Super Admin'}`);
    console.log(`New Pass   : ${newPassword}`);
    console.log('===================================================================');
    console.log('👉 You can now log in at https://admin.bigbites.pk\n');
  } else {
    user = await prisma.adminUser.create({
      data: {
        email,
        name: email.split('@')[0].toUpperCase() + ' (Super Admin)',
        passwordHash,
        roleId: superAdminRole.id,
      },
      include: { role: true },
    });
    console.log('\n===================================================================');
    console.log('✅ NEW SUPER ADMIN ACCOUNT CREATED');
    console.log('===================================================================');
    console.log(`User Email : ${user.email}`);
    console.log(`User Name  : ${user.name}`);
    console.log(`Role       : ${user.role?.name || 'Super Admin'}`);
    console.log(`New Pass   : ${newPassword}`);
    console.log('===================================================================');
    console.log('👉 You can now log in at https://admin.bigbites.pk\n');
  }
}

main()
  .catch((e) => {
    console.error('❌ Unexpected error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
