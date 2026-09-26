import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FulfillmentType } from '@prisma/client';
import { CategoriesService } from './categories.service';
import { AdminAuthGuard } from '../auth/jwt-auth.guard';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CategoryDto {
  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsEnum(FulfillmentType)
  fulfillmentType!: FulfillmentType;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  optionGroupIds?: string[];
}

class ReorderItemDto {
  @IsString()
  id!: string;

  @IsInt()
  @Min(0)
  displayOrder!: number;
}

class ReorderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items!: ReorderItemDto[];
}

@Controller('categories')
export class CategoriesController {
  constructor(private categories: CategoriesService) {}

  @Get()
  list(
    @Query('fulfillment') fulfillment?: FulfillmentType,
    @Query('admin') admin?: string,
  ) {
    return this.categories.list({
      fulfillment,
      activeOnly: admin !== '1',
    });
  }

  @UseGuards(AdminAuthGuard)
  @Put('reorder')
  reorder(@Body() dto: ReorderDto) {
    return this.categories.reorder(dto.items);
  }

  @Get(':slug')
  bySlug(@Param('slug') slug: string) {
    return this.categories.bySlug(slug);
  }

  @UseGuards(AdminAuthGuard)
  @Post()
  create(@Body() dto: CategoryDto) {
    return this.categories.create(dto);
  }

  @UseGuards(AdminAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CategoryDto>) {
    return this.categories.update(id, dto);
  }

  @UseGuards(AdminAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categories.remove(id);
  }
}
