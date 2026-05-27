import { Module, forwardRef } from '@nestjs/common';
import { RidersService } from './riders.service';
import { RidersController } from './riders.controller';
import { SocketModule } from '../socket/socket.module';

@Module({
  imports: [forwardRef(() => SocketModule)],
  providers: [RidersService],
  controllers: [RidersController],
  exports: [RidersService],
})
export class RidersModule {}
