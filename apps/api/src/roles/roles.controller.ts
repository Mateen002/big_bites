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
