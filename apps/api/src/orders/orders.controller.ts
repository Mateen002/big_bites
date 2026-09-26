import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrderStatus, PaymentMethod } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { OrdersService } from './orders.service';
import {
  AdminAuthGuard,
  CustomerAuthGuard,
  OptionalCustomerAuthGuard,
} from '../auth/jwt-auth.guard';

class CheckoutDto {
  @IsString()
  @MinLength(2)
  customerName!: string;

  @IsString()
  @MinLength(10)
  customerPhone!: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsString()
  @MinLength(5)
  addressLine!: string;

  @IsString()
  deliveryZoneId!: string;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsString()
  promoCode?: string;

  @IsOptional()
  @IsString()
  scheduledFor?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class StatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}

@Controller('orders')
export class OrdersController {
  constructor(private orders: OrdersService) {}

  @UseGuards(OptionalCustomerAuthGuard)
  @Post()
  checkout(
    @Headers('x-cart-session') sessionId: string | undefined,
    @Body() dto: CheckoutDto,
    @Req() req: { user?: { userId: string; role: string } | null },
  ) {
    const customerId =
      req.user?.role === 'customer' ? req.user.userId : undefined;
    return this.orders.checkout(sessionId, dto, customerId);
  }

  @UseGuards(CustomerAuthGuard)
  @Get('mine')
  myOrders(@Req() req: { user: { userId: string } }) {
    return this.orders.listForCustomer(req.user.userId);
  }

  @UseGuards(CustomerAuthGuard)
  @Get('mine/:id')
  myOrder(
    @Req() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.orders.getForCustomer(req.user.userId, id);
  }

  @UseGuards(AdminAuthGuard)
  @Get()
  list(@Query('status') status?: OrderStatus) {
    return this.orders.list(status);
  }

  @UseGuards(AdminAuthGuard)
  @Get('admin/:id')
  adminGet(@Param('id') id: string) {
    return this.orders.get(id);
  }

  @Get(':id/tracking')
  tracking(@Param('id') id: string) {
    return this.orders.tracking(id);
  }

  @UseGuards(AdminAuthGuard)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: StatusDto) {
    return this.orders.updateStatus(id, dto.status);
  }
}
