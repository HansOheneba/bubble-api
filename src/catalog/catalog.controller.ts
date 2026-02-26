import { Controller, Get } from '@nestjs/common';
import { CatalogService, CatalogDto } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  async getCatalog(): Promise<CatalogDto> {
    return this.catalogService.getCatalog();
  }
}
