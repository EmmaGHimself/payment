import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { CreateIntegrationDto, UpdateIntegrationDto, IntegrationConfigDto } from './dto/integration.dto';
import { AuthGuard } from '../common/guards/auth.guard';

@ApiTags('Integrations')
@Controller('integrations')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new integration' })
  @ApiResponse({ status: 201, description: 'Integration created successfully' })
  async create(@Body() createIntegrationDto: CreateIntegrationDto) {
    return this.integrationsService.create(createIntegrationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all integrations' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Integrations retrieved successfully' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.integrationsService.findAll(page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get integration by ID' })
  @ApiResponse({ status: 200, description: 'Integration retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.integrationsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update integration' })
  @ApiResponse({ status: 200, description: 'Integration updated successfully' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateIntegrationDto: UpdateIntegrationDto,
  ) {
    return this.integrationsService.update(id, updateIntegrationDto);
  }

  @Put(':id/configs')
  @ApiOperation({ summary: 'Update integration configurations' })
  @ApiResponse({ status: 200, description: 'Integration configs updated successfully' })
  async updateConfigs(
    @Param('id', ParseIntPipe) id: number,
    @Body() configDto: IntegrationConfigDto,
  ) {
    return this.integrationsService.updateConfigs(id, configDto);
  }

  @Post(':id/disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable integration' })
  @ApiResponse({ status: 200, description: 'Integration disabled successfully' })
  async disable(@Param('id', ParseIntPipe) id: number) {
    await this.integrationsService.disable(id);
    return { message: 'Integration disabled successfully' };
  }

  @Post(':id/enable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable integration' })
  @ApiResponse({ status: 200, description: 'Integration enabled successfully' })
  async enable(@Param('id', ParseIntPipe) id: number) {
    await this.integrationsService.enable(id);
    return { message: 'Integration enabled successfully' };
  }

  @Post(':id/regenerate-keys')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerate integration API keys' })
  @ApiResponse({ status: 200, description: 'API keys regenerated successfully' })
  async regenerateKeys(@Param('id', ParseIntPipe) id: number) {
    const keys = await this.integrationsService.regenerateKeys(id);
    return {
      message: 'API keys regenerated successfully',
      ...keys,
    };
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get integration statistics' })
  @ApiResponse({ status: 200, description: 'Integration stats retrieved successfully' })
  async getStats(@Param('id', ParseIntPipe) id: number) {
    return this.integrationsService.getIntegrationStats(id);
  }
}
