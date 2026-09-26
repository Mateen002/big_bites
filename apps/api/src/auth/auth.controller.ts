import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { AdminAuthGuard, CustomerAuthGuard, JwtAuthGuard } from './jwt-auth.guard';

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

class SignupDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

class ProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  /** Admin panel login */
  @Post('login')
  adminLogin(@Body() dto: LoginDto) {
    return this.auth.adminLogin(dto.email, dto.password);
  }

  @UseGuards(AdminAuthGuard)
  @Get('me')
  adminMe(@Req() req: { user: { userId: string } }) {
    return this.auth.adminMe(req.user.userId);
  }

  @Post('customer/signup')
  customerSignup(@Body() dto: SignupDto) {
    return this.auth.customerSignup(dto);
  }

  @Post('customer/login')
  customerLogin(@Body() dto: LoginDto) {
    return this.auth.customerLogin(dto.email, dto.password);
  }

  @UseGuards(CustomerAuthGuard)
  @Get('customer/me')
  customerMe(@Req() req: { user: { userId: string } }) {
    return this.auth.customerMe(req.user.userId);
  }

  @UseGuards(CustomerAuthGuard)
  @Patch('customer/me')
  updateProfile(
    @Req() req: { user: { userId: string } },
    @Body() dto: ProfileDto,
  ) {
    return this.auth.updateCustomerProfile(req.user.userId, dto);
  }

  /** Compatibility alias */
  @UseGuards(JwtAuthGuard)
  @Get('whoami')
  whoami(@Req() req: { user: { userId: string; role: string } }) {
    return req.user;
  }
}
