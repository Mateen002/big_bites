import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsInt, IsOptional, IsString, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ZonesService } from './zones.service';
import { AdminAuthGuard } from '../auth/jwt-auth.guard';

class ZoneDto {
  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsInt()
  @Min(0)
  feePkr!: number;

  @IsOptional()
  @IsInt()
  etaMinutesMin?: number;

  @IsOptional()
  @IsInt()
  etaMinutesMax?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  displayOrder?: number;
}

class ReorderItemDto {
  @IsString()
  id!: string;

  @IsInt()
  displayOrder!: number;
}

class ReorderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items!: ReorderItemDto[];
}

@Controller('zones')
export class ZonesController {
  constructor(private zones: ZonesService) {}

  @Get()
  list() {
    return this.zones.list(true);
  }

  @UseGuards(AdminAuthGuard)
  @Get('admin/all')
  listAll() {
    return this.zones.list(false);
  }

  @UseGuards(AdminAuthGuard)
  @Put('reorder')
  reorder(@Body() dto: ReorderDto) {
    return this.zones.reorder(dto.items);
  }

  @UseGuards(AdminAuthGuard)
  @Post()
  create(@Body() dto: ZoneDto) {
    return this.zones.create(dto);
  }

  @UseGuards(AdminAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<ZoneDto>) {
    return this.zones.update(id, dto);
  }

  @UseGuards(AdminAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.zones.remove(id);
  }
}
