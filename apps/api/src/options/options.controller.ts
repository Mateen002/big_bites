import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { OptionSelectType } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OptionsService } from './options.service';
import { AdminAuthGuard } from '../auth/jwt-auth.guard';

class OptionValueDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  label!: string;

  @IsOptional()
  @IsInt()
  priceDeltaPkr?: number;

  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class OptionGroupDto {
  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsEnum(OptionSelectType)
  selectType!: OptionSelectType;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  minSelect?: number;

  @IsOptional()
  @IsInt()
  maxSelect?: number | null;

  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionValueDto)
  values!: OptionValueDto[];
}

@Controller('option-groups')
export class OptionsController {
  constructor(private options: OptionsService) {}

  @Get()
  list() {
    return this.options.list();
  }

  @Get(':id')
  byId(@Param('id') id: string) {
    return this.options.byId(id);
  }

  @UseGuards(AdminAuthGuard)
  @Post()
  create(@Body() dto: OptionGroupDto) {
    return this.options.create(dto);
  }

  @UseGuards(AdminAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<OptionGroupDto>) {
    return this.options.update(id, dto);
  }

  @UseGuards(AdminAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.options.remove(id);
  }
}
