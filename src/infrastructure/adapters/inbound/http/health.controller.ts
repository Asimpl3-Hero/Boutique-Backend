import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HEALTH_RESPONSE_SCHEMA } from './docs/swagger.schemas';

@ApiTags('Salud')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({
    summary: 'Estado del servicio',
    description:
      'Sonda de vida: responde <span style="color:#2E9E6B;font-weight:bold">ok</span> si la API está arriba. No toca la base de datos.',
  })
  @ApiOkResponse({
    description: 'Servicio disponible.',
    schema: HEALTH_RESPONSE_SCHEMA,
  })
  public check(): { status: string } {
    return { status: 'ok' };
  }
}
