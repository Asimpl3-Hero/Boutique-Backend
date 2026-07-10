import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HEALTH_RESPONSE_SCHEMA } from './docs/swagger.schemas';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({
    summary: 'Health check',
    description: 'Liveness probe for the API.',
  })
  @ApiOkResponse({ description: 'Service is up.', schema: HEALTH_RESPONSE_SCHEMA })
  public check(): { status: string } {
    return { status: 'ok' };
  }
}
