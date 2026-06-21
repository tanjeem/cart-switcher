// Normalized types that sit between WooCommerce and Shopify schemas

export interface NormalizedProduct {
  sourceId: string
  title: string
  description: string
  vendor: string
  productType: string
  tags: string[]
  status: 'active' | 'draft'
  variants: NormalizedVariant[]
  images: NormalizedImage[]
  categories: string[]
  seoTitle?: string
  seoDescription?: string
  slug?: string
}

export interface NormalizedVariant {
  sku: string
  price: string
  compareAtPrice?: string
  weight?: number
  weightUnit?: string
  inventory: number
  option1?: string
  option2?: string
  option3?: string
  requiresShipping: boolean
  taxable: boolean
}

export interface NormalizedImage {
  src: string
  alt?: string
  position: number
}

export interface NormalizedCustomer {
  sourceId: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  acceptsMarketing: boolean
  addresses: NormalizedAddress[]
  note?: string
  totalSpent?: string
  ordersCount?: number
}

export interface NormalizedAddress {
  firstName: string
  lastName: string
  address1: string
  address2?: string
  city: string
  province?: string
  zip: string
  country: string
  phone?: string
  isDefault?: boolean
}

export interface NormalizedOrder {
  sourceId: string
  orderNumber: string
  email: string
  phone?: string
  note?: string
  financialStatus: string
  fulfillmentStatus: string | null
  currency: string
  lineItems: NormalizedLineItem[]
  shippingAddress?: NormalizedAddress
  billingAddress?: NormalizedAddress
  totalPrice: string
  subtotalPrice: string
  totalTax: string
  totalShipping: string
  discountCodes: string[]
  createdAt: string
  processedAt: string
  tags: string[]
}

export interface NormalizedLineItem {
  title: string
  variantTitle?: string
  sku?: string
  quantity: number
  price: string
  totalDiscount: string
  taxable: boolean
}

export interface NormalizedCoupon {
  sourceId: string
  code: string
  type: 'percentage' | 'fixed_amount' | 'free_shipping'
  value: string
  minimumOrderAmount?: string
  usageLimit?: number
  usedCount: number
  expiresAt?: string
  isActive: boolean
}

export interface NormalizedPost {
  sourceId: string
  title: string
  content: string
  excerpt?: string
  author: string
  status: 'published' | 'draft'
  slug: string
  publishedAt?: string
  tags: string[]
  seoTitle?: string
  seoDescription?: string
}

export interface WCCredentials {
  url: string
  consumerKey: string
  consumerSecret: string
}

export interface ShopifyCredentials {
  domain: string
  accessToken: string
}

export interface MigrationError {
  entity: string
  entityId: string
  message: string
  createdAt: string
}

// Which entity types are included in a migration run
export interface MigrationEntities {
  products: boolean
  customers: boolean
  orders: boolean
  coupons: boolean
  posts: boolean
}

export const ALL_ENTITIES: MigrationEntities = {
  products: true,
  customers: true,
  orders: true,
  coupons: true,
  posts: true,
}

export interface MigrationProgress {
  jobId: string
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED' | 'PARTIAL' | 'CANCELLED'
  startedAt?: string
  totalProducts: number
  totalOrders: number
  totalCustomers: number
  totalCoupons: number
  totalPosts: number
  doneProducts: number
  doneOrders: number
  doneCustomers: number
  doneCoupons: number
  donePosts: number
  failedProducts: number
  failedOrders: number
  failedCustomers: number
  errorLog?: string | null
  recentErrors?: MigrationError[]
}

export interface PreviewCounts {
  products: number
  orders: number
  customers: number
  coupons: number
  posts: number
}
