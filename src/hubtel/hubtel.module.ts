import { Module } from '@nestjs/common';
import { HubtelService } from './hubtel.service';

@Module({
  providers: [HubtelService],
  exports: [HubtelService],
})
export class HubtelModule {}
