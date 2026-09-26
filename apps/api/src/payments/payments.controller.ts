import { Controller, Get, Query } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @Get('sandbox/complete')
  complete(@Query('ref') ref: string) {
    return this.payments.completeSandbox(ref);
  }
}
