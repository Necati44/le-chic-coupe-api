import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { ServicesModule } from './services/services.module';
import { StaffAvailabilitiesModule } from './staff-availabilities/staff-availabilities.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AppointmentsModule,
    ServicesModule,
    StaffAvailabilitiesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
