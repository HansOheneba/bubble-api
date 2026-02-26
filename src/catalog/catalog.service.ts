import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface VariantDto {
  id: number;
  key: string;
  label: string;
  priceGhs: number; // we convert pesewas → GHS for the frontend
}

export interface MenuItemDto {
  id: number;
  slug: string;
  name: string;
  description: string;
  category: string;
  priceGhs: number | null; // null for shawarma with variants
  options: VariantDto[]; // empty array for drinks
  image: string | null;
  inStock: boolean;
}

export interface ToppingDto {
  id: number;
  name: string;
  priceGhs: number;
  inStock: boolean;
}

export interface CatalogDto {
  categories: Array<{ slug: string; name: string }>;
  items: MenuItemDto[];
  toppings: ToppingDto[];
}

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getCatalog(): Promise<CatalogDto> {
    const [categories, products, toppings] = await Promise.all([
      this.prisma.category.findMany({
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.product.findMany({
        where: {
          isActive: true, // hidden products never appear
        },
        orderBy: { sortOrder: 'asc' },
        include: {
          category: true,
          variants: { orderBy: { sortOrder: 'asc' } },
        },
      }),
      this.prisma.topping.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    const items: MenuItemDto[] = products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      category: p.category.slug,
      // drinks have priceInPesewas set; shawarma with variants has null
      priceGhs: p.priceInPesewas !== null ? p.priceInPesewas / 100 : null,
      options: p.variants.map((v) => ({
        id: v.id,
        key: v.key,
        label: v.label,
        priceGhs: v.priceInPesewas / 100,
      })),
      image: p.image,
      inStock: p.inStock,
    }));

    return {
      categories: categories.map((c) => ({ slug: c.slug, name: c.name })),
      items,
      toppings: toppings.map((t) => ({
        id: t.id,
        name: t.name,
        priceGhs: t.priceInPesewas / 100,
        inStock: t.inStock,
      })),
    };
  }
}
