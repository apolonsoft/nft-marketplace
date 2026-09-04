import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
@ApiTags('system')
@Controller('api/v1/system')
export class SystemController {
  @Get() @ApiOperation({ summary: 'API version information' }) get() {
    return { name: 'nft-marketplace-api', version: 'v1' };
  }
}
