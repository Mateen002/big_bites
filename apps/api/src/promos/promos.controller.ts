import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DiscountType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PromosService } from './promos.service';
import { AdminAuthGuard } from '../auth/jwt-auth.guard';

class PromoDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsEnum(DiscountType)
  discountType!: DiscountType;

  @IsInt()
  @Min(1)
  discountValue!: number;

  @IsOptional()
  @IsInt()
  minOrderPkr?: number;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  productId?: string | null;

  @IsOptional()
  @IsString()
  startsAt?: string | null;

  @IsOptional()
  @IsString()
  endsAt?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@Controller('promos')
export class PromosController {
  constructor(private promos: PromosService) {}

  @Get('validate')
  validate(@Query('code') code: string, @Query('subtotal') subtotal?: string) {
    return this.promos.validate(code, Number(subtotal || 0));
  }

  @UseGuards(AdminAuthGuard)
  @Get()
  list() {
    return this.promos.list();
  }

  @UseGuards(AdminAuthGuard)
  @Post()
  create(@Body() dto: PromoDto) {
    return this.promos.create(dto);
  }

  @UseGuards(AdminAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<PromoDto>) {
    return this.promos.update(id, dto);
  }

  @UseGuards(AdminAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.promos.remove(id);
  }
}
