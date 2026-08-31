import {
  ProductDTO,
  ProductImageDTO,
  ProductVariantDTO,
  CategoryDTO,
  CartDTO,
  CartItemDTO,
  OrderDTO,
  OrderDetailDTO,
  OrderItemDTO,
  OrderStatusHistoryDTO,
  MultilingualText,
  UserDTO,
} from '@swisswall/types';
import { Decimal } from '@prisma/client/runtime/library';

function toNumber(value: Decimal | number): number {
  return typeof value === 'number' ? value : Number(value);
}

function toMultilingualText(json: unknown): MultilingualText {
  const obj = json as MultilingualText;
  return {
    de: obj.de || '',
    fr: obj.fr || '',
    en: obj.en || '',
    sq: obj.sq || '',
  };
}

export function mapProductImage(image: {
  id: string;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
}): ProductImageDTO {
  return {
    id: image.id,
    url: image.url,
    isPrimary: image.isPrimary,
    sortOrder: image.sortOrder,
  };
}

export function mapProductVariant(variant: {
  id: string;
  nameJson: unknown;
  sku: string;
  priceChf: Decimal;
  stockQuantity: number;
  attributes: unknown;
  isActive: boolean;
}): ProductVariantDTO {
  return {
    id: variant.id,
    nameJson: toMultilingualText(variant.nameJson),
    sku: variant.sku,
    priceChf: toNumber(variant.priceChf),
    stockQuantity: variant.stockQuantity,
    attributes: (variant.attributes as Record<string, unknown>) || {},
    isActive: variant.isActive,
  };
}

export function mapProduct(product: {
  id: string;
  slug: string;
  sku: string;
  nameJson: unknown;
  descJson: unknown;
  specsJson: unknown;
  acousticRating: number | null;
  fireRatingClass: string | null;
  material: string | null;
  priceChf: Decimal;
  priceBtwChf: Decimal;
  vatRate: Decimal;
  stockQuantity: number;
  isFeatured: boolean;
  isActive: boolean;
  categoryId: string;
  images?: { id: string; url: string; isPrimary: boolean; sortOrder: number }[];
  variants?: Parameters<typeof mapProductVariant>[0][];
  category?: Parameters<typeof mapCategory>[0];
}): ProductDTO {
  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    nameJson: toMultilingualText(product.nameJson),
    descJson: toMultilingualText(product.descJson),
    specsJson: product.specsJson as ProductDTO['specsJson'],
    acousticRating: product.acousticRating,
    fireRatingClass: product.fireRatingClass,
    material: product.material,
    priceChf: toNumber(product.priceChf),
    priceBtwChf: toNumber(product.priceBtwChf),
    vatRate: toNumber(product.vatRate),
    stockQuantity: product.stockQuantity,
    isFeatured: product.isFeatured,
    isActive: product.isActive,
    categoryId: product.categoryId,
    category: product.category ? mapCategory(product.category) : undefined,
    images: (product.images || []).map(mapProductImage),
    variants: (product.variants || []).map(mapProductVariant),
  };
}

export function mapCategory(category: {
  id: string;
  slug: string;
  nameJson: unknown;
  descJson?: unknown | null;
  imageUrl?: string | null;
  parentId?: string | null;
  children?: Parameters<typeof mapCategory>[0][];
}): CategoryDTO {
  return {
    id: category.id,
    slug: category.slug,
    nameJson: toMultilingualText(category.nameJson),
    descJson: category.descJson ? toMultilingualText(category.descJson) : null,
    imageUrl: category.imageUrl,
    parentId: category.parentId,
    children: category.children?.map(mapCategory),
  };
}

export function mapCartItem(item: {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  product: Parameters<typeof mapProduct>[0];
}): CartItemDTO {
  const product = mapProduct(item.product);
  const variant = item.variantId
    ? product.variants.find((v) => v.id === item.variantId) || null
    : null;
  return {
    id: item.id,
    productId: item.productId,
    product,
    variantId: item.variantId,
    variant,
    quantity: item.quantity,
  };
}

export function mapCart(cart: {
  id: string;
  userId: string | null;
  sessionId: string | null;
  items: Parameters<typeof mapCartItem>[0][];
}): CartDTO {
  return {
    id: cart.id,
    userId: cart.userId,
    sessionId: cart.sessionId,
    items: cart.items.map(mapCartItem),
  };
}

export function mapOrderItem(item: {
  id: string;
  productId: string;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPriceChf: Decimal;
  totalChf: Decimal;
}): OrderItemDTO {
  return {
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    variantName: item.variantName,
    quantity: item.quantity,
    unitPriceChf: toNumber(item.unitPriceChf),
    totalChf: toNumber(item.totalChf),
  };
}

export function mapOrder(order: {
  id: string;
  orderNumber: string;
  userId: string | null;
  guestEmail: string | null;
  status: OrderDTO['status'];
  paymentStatus?: OrderDTO['paymentStatus'];
  deliveryStatus?: OrderDTO['deliveryStatus'];
  country?: string | null;
  currency?: string | null;
  couponCode?: string | null;
  shippingMethod?: string | null;
  trackingNumber?: string | null;
  items: Parameters<typeof mapOrderItem>[0][];
  shippingAddressJson: unknown;
  billingAddressJson: unknown;
  subtotalChf: Decimal;
  vatAmountChf: Decimal;
  shippingCostChf: Decimal;
  discountAmountChf: Decimal;
  totalChf: Decimal;
  paymentMethod: string;
  invoiceUrl: string | null;
  createdAt: Date;
}): OrderDTO {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    userId: order.userId,
    guestEmail: order.guestEmail,
    status: order.status,
    paymentStatus: order.paymentStatus,
    deliveryStatus: order.deliveryStatus,
    country: order.country as OrderDTO['country'],
    currency: order.currency || undefined,
    couponCode: order.couponCode,
    shippingMethod: order.shippingMethod,
    trackingNumber: order.trackingNumber,
    items: order.items.map(mapOrderItem),
    shippingAddressJson: order.shippingAddressJson as OrderDTO['shippingAddressJson'],
    billingAddressJson: order.billingAddressJson as OrderDTO['billingAddressJson'],
    subtotalChf: toNumber(order.subtotalChf),
    vatAmountChf: toNumber(order.vatAmountChf),
    shippingCostChf: toNumber(order.shippingCostChf),
    discountAmountChf: toNumber(order.discountAmountChf),
    totalChf: toNumber(order.totalChf),
    paymentMethod: order.paymentMethod,
    invoiceUrl: order.invoiceUrl,
    createdAt: order.createdAt.toISOString(),
  };
}

export function mapOrderDetail(order: Parameters<typeof mapOrder>[0] & {
  notes: string | null;
  statusHistory: { id: string; status: OrderDTO['status']; note: string | null; createdAt: Date }[];
  user?: { id: string; email: string; firstName: string; lastName: string; phone: string | null } | null;
}): OrderDetailDTO {
  const statusHistory: OrderStatusHistoryDTO[] = order.statusHistory.map((h) => ({
    id: h.id,
    status: h.status,
    note: h.note,
    createdAt: h.createdAt.toISOString(),
  }));

  return {
    ...mapOrder(order),
    notes: order.notes,
    statusHistory,
    user: order.user
      ? {
          id: order.user.id,
          email: order.user.email,
          firstName: order.user.firstName,
          lastName: order.user.lastName,
          phone: order.user.phone,
        }
      : null,
  };
}

export function mapUser(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  companyName?: string | null;
  vatNumber?: string | null;
  role: UserDTO['role'];
  preferredLanguage: UserDTO['preferredLanguage'];
  emailVerified: boolean;
  createdAt: Date;
}): UserDTO {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    companyName: user.companyName,
    vatNumber: user.vatNumber,
    role: user.role,
    preferredLanguage: user.preferredLanguage,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
  };
}
