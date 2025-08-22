import { Body, Controller, ForbiddenException, Post } from '@nestjs/common';
import { DevHelperService } from './dev-helper.service';
import { IdTokenByUidDto } from './dto/idtoken.dto';

@Controller('dev-helper/')
export class DevHelperController {
  constructor(private readonly service: DevHelperService) {}

  @Post('idTokenByUid')
  async idTokenByUid(@Body() dto: IdTokenByUidDto) {
    return this.service.idTokenByUid(dto.uid);
  }
}
