// Shared TypeScript Types for Swiss Wall Panels

export type Language = 'DE' | 'FR' | 'EN' | 'SQ';
export type Role = 'USER' | 'ADMIN' | 'SUPERADMIN';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

export type DeliveryStatus =
  | 'NEW'
  | 'PROCESSING'
  | 'READY_TO_SHIP'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED';

export type CountryCode = 'CH' | 'DE' | 'FR' | 'IT';

export type OrderStatus =
  | 'PENDING'
  | 'PAYMENT_CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export type QuoteStatus =
  | 'SUBMITTED'
  | 'VIEWED'
  | 'QUOTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED';

export interface MultilingualText {
  de: string;
  fr: string;
  en: string;
  sq: string;
  [key: string]: string;
}

export interface ProductSpecs {
  thickness_mm: number;
  width_mm: number;
  height_mm: number;
  weight_kg: number;
  [key: string]: any;
}

export interface UserDTO {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  companyName?: string | null;
  vatNumber?: string | null;
  role: Role;
  preferredLanguage: Language;
  emailVerified: boolean;
  createdAt: string;
}

export interface OrderStatusHistoryDTO {
  id: string;
  status: OrderStatus;
  note?: string | null;
  createdAt: string;
}

export interface OrderDetailDTO extends OrderDTO {
  notes?: string | null;
  statusHistory: OrderStatusHistoryDTO[];
  user?: Pick<UserDTO, 'id' | 'email' | 'firstName' | 'lastName' | 'phone'> | null;
}

export interface CheckoutResponseDTO {
  order: OrderDTO;
  clientSecret?: string | null;
  stripePublishableKey?: string | null;
}

export interface PaginatedProductsDTO {
  items: ProductDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProductImageDTO {
  id: string;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
}

export type SiteImageSection = 'GALLERY' | 'ABOUT';

export interface SiteImageDTO {
  id: string;
  section: SiteImageSection;
  url: string;
  altJson?: MultilingualText | null;
  sortOrder: number;
  isActive: boolean;
}

export interface SiteImagesDTO {
  gallery: SiteImageDTO[];
  about: SiteImageDTO[];
}

export interface ColorSwatchDTO {
  id: string;
  code: string;
  nameJson: MultilingualText;
  imageUrl: string;
  thumbnailUrl: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ColorCatalogDTO {
  id: string;
  slug: string;
  nameJson: MultilingualText;
  descJson: MultilingualText;
  sortOrder: number;
  isActive: boolean;
  swatches: ColorSwatchDTO[];
}

export interface ProductVariantDTO {
  id: string;
  nameJson: MultilingualText;
  sku: string;
  priceChf: number;
  stockQuantity: number;
  attributes: Record<string, any>;
  isActive: boolean;
}

export interface ProductDTO {
  id: string;
  slug: string;
  sku: string;
  nameJson: MultilingualText;
  descJson: MultilingualText;
  specsJson: ProductSpecs;
  acousticRating?: number | null;
  fireRatingClass?: string | null;
  material?: string | null;
  priceChf: number;
  priceBtwChf: number; // B2B price
  vatRate: number;
  stockQuantity: number;
  isFeatured: boolean;
  isActive: boolean;
  categoryId: string;
  category?: CategoryDTO | null;
  images: ProductImageDTO[];
  variants: ProductVariantDTO[];
}

export interface CategoryDTO {
  id: string;
  slug: string;
  nameJson: MultilingualText;
  descJson?: MultilingualText | null;
  imageUrl?: string | null;
  parentId?: string | null;
  children?: CategoryDTO[];
}

export interface CartItemDTO {
  id: string;
  productId: string;
  product: ProductDTO;
  variantId?: string | null;
  variant?: ProductVariantDTO | null;
  quantity: number;
}

export interface CartDTO {
  id: string;
  userId?: string | null;
  sessionId?: string | null;
  items: CartItemDTO[];
}

export interface OrderItemDTO {
  id: string;
  productId: string;
  productName: string;
  variantName?: string | null;
  quantity: number;
  unitPriceChf: number;
  totalChf: number;
}

export interface AddressDTO {
  id?: string;
  firstName: string;
  lastName: string;
  company?: string | null;
  street: string;
  houseNumber: string;
  postCode: string;
  city: string;
  canton: string;
  country: string;
  type?: 'shipping' | 'billing';
  isDefault?: boolean;
}

export interface OrderDTO {
  id: string;
  orderNumber: string;
  userId?: string | null;
  guestEmail?: string | null;
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  deliveryStatus?: DeliveryStatus;
  country?: CountryCode;
  currency?: string;
  items: OrderItemDTO[];
  shippingAddressJson: AddressDTO;
  billingAddressJson: AddressDTO;
  subtotalChf: number;
  vatAmountChf: number;
  shippingCostChf: number;
  discountAmountChf: number;
  totalChf: number;
  paymentMethod: string;
  shippingMethod?: string | null;
  trackingNumber?: string | null;
  couponCode?: string | null;
  invoiceUrl?: string | null;
  createdAt: string;
}

export interface ShippingRateDTO {
  id: string;
  country: CountryCode;
  carrier: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  minDays: number;
  maxDays: number;
  freeAbove?: number | null;
  isActive: boolean;
}

export interface DashboardStatsDTO {
  todayRevenue: number;
  monthRevenue: number;
  newOrders: number;
  newCustomers: number;
  pendingPayments: number;
  lowStockProducts: number;
  revenueByCountry: Record<string, number>;
  topProducts: { name: string; quantity: number; revenue: number }[];
  recentOrders: OrderDTO[];
}

export interface QuoteItemDTO {
  id: string;
  productId?: string | null;
  productName: string;
  quantity: number;
  note?: string | null;
}

export interface QuoteDTO {
  id: string;
  quoteNumber: string;
  userId?: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone?: string | null;
  company?: string | null;
  projectDesc: string;
  roomDimensions?: {
    width_m: number;
    height_m: number;
    length_m: number;
  } | null;
  items: QuoteItemDTO[];
  status: QuoteStatus;
  quotePdfUrl?: string | null;
  createdAt: string;
}
