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
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { OrdersService } from './orders.service';
import {
  AdminAuthGuard,
  CustomerAuthGuard,
  OptionalAuthGuard,
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
  @IsIn(['DELIVERY', 'PICKUP'])
  orderType?: 'DELIVERY' | 'PICKUP';

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

  @UseGuards(OptionalAuthGuard)
  @Get(':id/tracking')
  tracking(
    @Param('id') id: string,
    @Req() req: { user?: { userId: string; role: string } | null },
  ) {
    return this.orders.tracking(id, req?.user);
  }

  @UseGuards(AdminAuthGuard)
  @Post('test-telegram')
  testTelegram() {
    return this.orders.sendTestTelegramAlert();
  }

  @UseGuards(AdminAuthGuard)
  @Post('test-whatsapp')
  testWhatsApp() {
    return this.orders.sendTestWhatsAppAlert();
  }

  @UseGuards(AdminAuthGuard)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: StatusDto) {
    return this.orders.updateStatus(id, dto.status);
  }
}
