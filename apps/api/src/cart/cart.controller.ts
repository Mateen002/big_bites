import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CartService } from './cart.service';
import { v4 as uuid } from 'uuid';

class SelectionDto {
  @IsString()
  optionGroupId!: string;

  @IsString()
  optionValueId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

class AddItemDto {
  @IsString()
  productId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  quantity?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectionDto)
  selections?: SelectionDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

class UpdateItemDto {
  @IsInt()
  @Min(0)
  @Max(99)
  quantity!: number;
}

@Controller('cart')
export class CartController {
  constructor(private cart: CartService) {}

  private sessionId(
    header: string | undefined,
    res: Response,
  ): string {
    let id = header?.trim() || undefined;
    if (!id) {
      id = uuid();
    }
    // Always echo session so clients can persist it (CORS-exposed)
    res.setHeader('X-Cart-Session', id);
    return id;
  }

  @Get()
  get(
    @Headers('x-cart-session') header: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const sessionId = this.sessionId(header, res);
    return this.cart.getCart(sessionId);
  }

  @Post('items')
  add(
    @Headers('x-cart-session') header: string | undefined,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: AddItemDto,
  ) {
    const sessionId = this.sessionId(header, res);
    return this.cart.addItem(sessionId, dto);
  }

  @Patch('items/:itemId')
  update(
    @Headers('x-cart-session') header: string | undefined,
    @Res({ passthrough: true }) res: Response,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemDto,
  ) {
    const sessionId = this.sessionId(header, res);
    return this.cart.updateItem(sessionId, itemId, dto.quantity);
  }

  @Delete('items/:itemId')
  remove(
    @Headers('x-cart-session') header: string | undefined,
    @Res({ passthrough: true }) res: Response,
    @Param('itemId') itemId: string,
  ) {
    const sessionId = this.sessionId(header, res);
    return this.cart.removeItem(sessionId, itemId);
  }

  @Delete()
  clear(
    @Headers('x-cart-session') header: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const sessionId = this.sessionId(header, res);
    return this.cart.clear(sessionId);
  }
}
