import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { ServicesModule } from './services/services.module';
import { StaffAvailabilitiesModule } from './staff-availabilities/staff-availabilities.module';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AppointmentsModule,
    ServicesModule,
    StaffAvailabilitiesModule,
    ThrottlerModule.forRoot([{
      ttl: 60, // fenêtre 60s
      limit: 100, // 100 requêtes / minute / IP
    }]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
