import { Module } from '@nestjs/common';
import { PublicAvailabilitiesController } from './public-availabilities.controller';
import { PublicAvailabilitiesService } from './public-availabilities.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [PublicAvailabilitiesController],
  providers: [PublicAvailabilitiesService, PrismaService],
})
export class PublicAvailabilitiesModule {}
