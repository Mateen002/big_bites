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
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductsService } from './products.service';
import { AdminAuthGuard } from '../auth/jwt-auth.guard';

class ProductDto {
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

  @IsInt()
  @Min(0)
  pricePkr!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  costPkr?: number | null;

  @IsOptional()
  @IsInt()
  compareAtPkr?: number | null;

  @IsString()
  categoryId!: string;

  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  packSize?: string | null;

  @IsOptional()
  @IsInt()
  weightGrams?: number | null;

  @IsOptional()
  @IsInt()
  piecesPerPack?: number | null;

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

@Controller('products')
export class ProductsController {
  constructor(private products: ProductsService) {}

  @Get()
  list(
    @Query('category') category?: string,
    @Query('fulfillment') fulfillment?: string,
    @Query('admin') admin?: string,
    @Query('q') q?: string,
  ) {
    return this.products.list({
      categorySlug: category,
      fulfillment,
      activeOnly: admin !== '1',
      search: q,
    });
  }

  @UseGuards(AdminAuthGuard)
  @Put('reorder')
  reorder(@Body() dto: ReorderDto) {
    return this.products.reorder(dto.items);
  }

  @Get(':slug')
  bySlug(@Param('slug') slug: string) {
    return this.products.bySlug(slug);
  }

  @UseGuards(AdminAuthGuard)
  @Post()
  create(@Body() dto: ProductDto) {
    return this.products.create(dto);
  }

  @UseGuards(AdminAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<ProductDto>) {
    return this.products.update(id, dto);
  }

  @UseGuards(AdminAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.products.remove(id);
  }
}
