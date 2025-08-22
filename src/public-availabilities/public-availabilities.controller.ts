import { Controller, Get, Query } from '@nestjs/common';
import { PublicAvailabilitiesService } from './public-availabilities.service';
import { PublicDayQueryDto } from './dto/public-day.dto';

@Controller('public/availabilities')
export class PublicAvailabilitiesController {
  constructor(private readonly service: PublicAvailabilitiesService) {}

  /** Créneaux réservable publics pour un jour donné */
  @Get('day')
  day(@Query() q: PublicDayQueryDto) {
    return this.service.day(q);
  }
}
