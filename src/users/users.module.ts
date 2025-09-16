import { forwardRef, Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from '@prisma/prisma.service';
import { AppointmentsModule } from 'src/appointments/appointments.module';

@Module({
  imports: [forwardRef(() => AppointmentsModule)],
  controllers: [UsersController],
  providers: [UsersService, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}
