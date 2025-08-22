import { Module } from '@nestjs/common';
import { DevHelperController } from './dev-helper.controller';
import { HttpModule } from '@nestjs/axios';
import { DevHelperService } from './dev-helper.service';

@Module({
  imports: [HttpModule],
  controllers: [DevHelperController],
  providers: [DevHelperService],
})
export class DevHelperModule {}
