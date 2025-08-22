import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [UsersModule],        // injecte UsersService
  controllers: [AuthController],
  providers: [AuthService, RolesGuard],
  exports: [AuthService, RolesGuard],
})
export class AuthModule {}
