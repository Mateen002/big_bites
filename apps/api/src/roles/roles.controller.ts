import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../auth/jwt-auth.guard';
import { RolesService } from './roles.service';

@Controller('roles')
@UseGuards(AdminAuthGuard)
export class RolesController {
  constructor(private roles: RolesService) {}

  @Get()
  list() {
    return this.roles.list();
  }

  // --- User / Staff Management Endpoints ---

  @Get('users')
  listUsers() {
    return this.roles.listUsers();
  }

  @Post('users')
  createUser(
    @Req() req: any,
    @Body() body: { name: string; email: string; password: string; roleId?: string },
  ) {
    return this.roles.createUser(req.user, body);
  }

  @Put('users/:id')
  updateUser(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { name?: string; email?: string; password?: string; roleId?: string },
  ) {
    return this.roles.updateUser(req.user, id, body);
  }

  @Delete('users/:id')
  deleteUser(@Req() req: any, @Param('id') id: string) {
    return this.roles.deleteUser(req.user, id);
  }

  @Post('users/:id/reset-password')
  resetPassword(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { newPassword: string },
  ) {
    return this.roles.resetUserPassword(req.user, id, body.newPassword);
  }

  // --- Role Specific Endpoints ---

  @Get(':id')
  byId(@Param('id') id: string) {
    return this.roles.byId(id);
  }

  @Post()
  create(
    @Req() req: any,
    @Body() body: { name: string; description?: string; permissions: string[] },
  ) {
    return this.roles.create(req.user, body);
  }

  @Put(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; permissions?: string[] },
  ) {
    return this.roles.update(req.user, id, body);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.roles.delete(req.user, id);
  }
}

