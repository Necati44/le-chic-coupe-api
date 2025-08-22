import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { ServicesModule } from './services/services.module';
import { StaffAvailabilitiesModule } from './staff-availabilities/staff-availabilities.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth/auth.controller';
import * as dotenv from 'dotenv';
import { DevHelperModule } from './dev-helper/dev-helper.module';
import { AuthModule } from './auth/auth.module';
import { PublicAvailabilitiesModule } from './public-availabilities/public-availabilities.module';
dotenv.config();

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AppointmentsModule,
    ServicesModule,
    StaffAvailabilitiesModule,
    PublicAvailabilitiesModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60, // fenêtre 60s
        limit: 100, // 100 requêtes / minute / IP
      },
    ]),
    AuthModule,
    ...(process.env.NODE_ENV !== 'dev' ? [DevHelperModule] : []),
  ],
  controllers: [AppController, AuthController],
  providers: [AppService],
})
export class AppModule {}
