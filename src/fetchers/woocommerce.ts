import axios, { AxiosInstance } from 'axios'
import type {
  WCCredentials,
  NormalizedProduct,
  NormalizedCustomer,
  NormalizedOrder,
  NormalizedCoupon,
  NormalizedPost,
  PreviewCounts,
} from '@/types'

const PAGE_SIZE = 100

export class WooCommerceFetcher {
  private client: AxiosInstance

  constructor(private creds: WCCredentials) {
    const normalizedUrl = creds.url
      .trim()
      .replace(/\/$/, '')
      .replace(/^(?!https?:\/\/)/, 'https://')

    this.client = axios.create({
      baseURL: `${normalizedUrl}/wp-json/wc/v3`,
      auth: {
        username: creds.consumerKey,
        password: creds.consumerSecret,
      },
      timeout: 30000,
    })
  }

  async validate(): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.client.get('/products', { params: { per_page: 1 } })
      return { ok: true }
    } catch (err: unknown) {
      console.error('[WC validate error]', err)
      if (axios.isAxiosError(err)) {
        const status = err.response?.status
        if (status === 401) return { ok: false, error: 'Invalid Consumer Key or Secret — check your WooCommerce API keys' }
        if (status === 404) return { ok: false, error: 'WooCommerce REST API not found — make sure the URL is correct and REST API is enabled' }
        if (status === 403) return { ok: false, error: 'API key does not have Read permission — set it to Read/Write in WooCommerce settings' }
        if (!err.response) return { ok: false, error: `Could not reach the store: ${err.message}` }
        return { ok: false, error: `WooCommerce returned error ${status}: ${err.message}` }
      }
      const msg = err instanceof Error ? err.message : String(err)
      return { ok: false, error: `Connection error: ${msg}` }
    }
  }

  async getPreviewCounts(): Promise<PreviewCounts> {
    const [products, orders, customers, coupons, posts] = await Promise.all([
      this.getCount('/products'),
      this.getCount('/orders'),
      this.getCount('/customers'),
      this.getCount('/coupons'),
      this.getPostCount(),
    ])
    return { products, orders, customers, coupons, posts }
  }

  private async getCount(endpoint: string): Promise<number> {
    const res = await this.client.head(endpoint, { params: { per_page: 1 } })
    return parseInt(res.headers['x-wp-total'] ?? '0', 10)
  }

  private async getPostCount(): Promise<number> {
    try {
      const base = this.creds.url.trim().replace(/\/$/, '').replace(/^(?!https?:\/\/)/, 'https://')
      const res = await axios.head(
        `${base}/wp-json/wp/v2/posts`,
        { params: { per_page: 1 } }
      )
      return parseInt(res.headers['x-wp-total'] ?? '0', 10)
    } catch {
      return 0
    }
  }

  async getAllProducts(limit?: number): Promise<NormalizedProduct[]> {
    const raw = await this.paginate('/products', limit)
    // Fetch full variation data for variable products
    const withVariations = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (raw as any[]).map(async (p: any) => {
        if (p.type === 'variable' && p.variations?.length > 0) {
          try {
            const res = await this.client.get(`/products/${p.id}/variations`, { params: { per_page: 100 } })
            return { ...p, _variationDetails: res.data }
          } catch {
            return p
          }
        }
        return p
      })
    )
    return withVariations.map(this.normalizeProduct)
  }

  async getAllCustomers(limit?: number): Promise<NormalizedCustomer[]> {
    const raw = await this.paginate('/customers', limit)
    return raw.map(this.normalizeCustomer)
  }

  async getAllOrders(limit?: number): Promise<NormalizedOrder[]> {
    const raw = await this.paginate('/orders', limit)
    return raw.map(this.normalizeOrder)
  }

  async getAllCoupons(limit?: number): Promise<NormalizedCoupon[]> {
    const raw = await this.paginate('/coupons', limit)
    return raw.map(this.normalizeCoupon)
  }

  async getAllPosts(limit?: number): Promise<NormalizedPost[]> {
    const raw = await this.paginateWP('/wp/v2/posts', limit)
    return raw.map(this.normalizePost)
  }

  private async paginate(endpoint: string, limit?: number): Promise<unknown[]> {
    const results: unknown[] = []
    let page = 1

    while (true) {
      const res = await this.client.get(endpoint, {
        params: { per_page: PAGE_SIZE, page },
      })

      const items: unknown[] = res.data
      results.push(...items)

      if (limit && results.length >= limit) return results.slice(0, limit)
      if (items.length < PAGE_SIZE) break
      page++
    }

    return results
  }

  private async paginateWP(endpoint: string, limit?: number): Promise<unknown[]> {
    const results: unknown[] = []
    let page = 1
    const base = this.creds.url.trim().replace(/\/$/, '').replace(/^(?!https?:\/\/)/, 'https://') + '/wp-json'

    while (true) {
      const res = await axios.get(`${base}${endpoint}`, {
        params: { per_page: PAGE_SIZE, page },
      })

      const items: unknown[] = res.data
      results.push(...items)

      if (limit && results.length >= limit) return results.slice(0, limit)
      if (items.length < PAGE_SIZE) break
      page++
    }

    return results
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private normalizeProduct(p: any): NormalizedProduct {
    return {
      sourceId: String(p.id),
      title: p.name,
      description: p.description || p.short_description || '',
      vendor: p.brands?.[0]?.name ?? '',
      productType: p.type ?? 'simple',
      tags: (p.tags ?? []).map((t: { name: string }) => t.name),
      status: p.status === 'publish' ? 'active' : 'draft',
      categories: (p.categories ?? []).map((c: { name: string }) => c.name),
      seoTitle: p.yoast_head_json?.title ?? p.name,
      seoDescription: p.yoast_head_json?.description ?? '',
      slug: p.slug,
      images: (p.images ?? []).map((img: { src: string; alt: string }, i: number) => ({
        src: img.src,
        alt: img.alt || p.name,
        position: i + 1,
      })),
      variants: p.type === 'variable'
        ? (p._variationDetails ?? []).map((v: {
            id: number; sku: string; regular_price: string; sale_price: string;
            weight: string; stock_quantity: number;
            attributes: { name: string; option: string }[]
          }) => ({
            sku: v.sku || `${p.id}-${v.id}`,
            price: v.sale_price || v.regular_price || '0',
            compareAtPrice: v.sale_price ? v.regular_price : undefined,
            weight: parseFloat(v.weight) || undefined,
            weightUnit: 'kg',
            inventory: v.stock_quantity ?? 0,
            option1: v.attributes?.[0]?.option ?? 'Default',
            option2: v.attributes?.[1]?.option,
            option3: v.attributes?.[2]?.option,
            requiresShipping: true,
            taxable: true,
          }))
        : [{
            sku: p.sku || String(p.id),
            price: p.sale_price || p.regular_price || '0',
            compareAtPrice: p.sale_price ? p.regular_price : undefined,
            weight: parseFloat(p.weight) || undefined,
            weightUnit: 'kg',
            inventory: p.stock_quantity ?? 0,
            option1: 'Default Title',
            requiresShipping: true,
            taxable: true,
          }],
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private normalizeCustomer(c: any): NormalizedCustomer {
    return {
      sourceId: String(c.id),
      firstName: c.first_name,
      lastName: c.last_name,
      email: c.email,
      phone: c.billing?.phone,
      acceptsMarketing: false,
      note: c.username,
      totalSpent: c.total_spent,
      ordersCount: c.orders_count,
      addresses: [
        c.billing?.address_1?.trim() && {
          firstName: c.billing.first_name || '',
          lastName: c.billing.last_name || '',
          address1: c.billing.address_1,
          address2: c.billing.address_2 || '',
          city: c.billing.city || '',
          province: c.billing.state || '',
          zip: c.billing.postcode || '',
          country: c.billing.country || 'US',
          phone: c.billing.phone || undefined,
          isDefault: true,
        },
        c.shipping?.address_1?.trim() && {
          firstName: c.shipping.first_name || '',
          lastName: c.shipping.last_name || '',
          address1: c.shipping.address_1,
          address2: c.shipping.address_2 || '',
          city: c.shipping.city || '',
          province: c.shipping.state || '',
          zip: c.shipping.postcode || '',
          country: c.shipping.country || 'US',
          isDefault: false,
        },
      ].filter(Boolean) as NormalizedCustomer['addresses'],
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private normalizeOrder(o: any): NormalizedOrder {
    const financialMap: Record<string, string> = {
      pending: 'pending',
      processing: 'paid',
      'on-hold': 'pending',
      completed: 'paid',
      cancelled: 'voided',
      refunded: 'refunded',
      failed: 'voided',
    }

    return {
      sourceId: String(o.id),
      orderNumber: String(o.number),
      email: o.billing?.email ?? '',
      phone: o.billing?.phone,
      note: o.customer_note,
      financialStatus: financialMap[o.status] ?? 'pending',
      fulfillmentStatus: o.status === 'completed' ? 'fulfilled' : null,
      currency: o.currency,
      totalPrice: o.total,
      subtotalPrice: o.subtotal,
      totalTax: o.total_tax,
      totalShipping: o.shipping_total,
      discountCodes: (o.coupon_lines ?? []).map((c: { code: string }) => c.code),
      createdAt: o.date_created,
      processedAt: o.date_completed ?? o.date_created,
      tags: [],
      lineItems: (o.line_items ?? []).map((li: {
        name: string; variation_id: number; sku: string;
        quantity: number; price: string; total_tax: string;
      }) => ({
        title: li.name,
        variantTitle: li.variation_id ? String(li.variation_id) : undefined,
        sku: li.sku,
        quantity: li.quantity,
        price: String(li.price),
        totalDiscount: '0',
        taxable: parseFloat(li.total_tax) > 0,
      })),
      shippingAddress: o.shipping?.address_1 ? {
        firstName: o.shipping.first_name,
        lastName: o.shipping.last_name,
        address1: o.shipping.address_1,
        address2: o.shipping.address_2,
        city: o.shipping.city,
        province: o.shipping.state,
        zip: o.shipping.postcode,
        country: o.shipping.country,
      } : undefined,
      billingAddress: o.billing?.address_1 ? {
        firstName: o.billing.first_name,
        lastName: o.billing.last_name,
        address1: o.billing.address_1,
        address2: o.billing.address_2,
        city: o.billing.city,
        province: o.billing.state,
        zip: o.billing.postcode,
        country: o.billing.country,
        phone: o.billing.phone,
      } : undefined,
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private normalizeCoupon(c: any): NormalizedCoupon {
    const typeMap: Record<string, NormalizedCoupon['type']> = {
      percent: 'percentage',
      fixed_cart: 'fixed_amount',
      fixed_product: 'fixed_amount',
    }

    return {
      sourceId: String(c.id),
      code: c.code,
      type: typeMap[c.discount_type] ?? 'fixed_amount',
      value: c.amount,
      minimumOrderAmount: c.minimum_amount || undefined,
      usageLimit: c.usage_limit || undefined,
      usedCount: c.usage_count ?? 0,
      expiresAt: c.date_expires ?? undefined,
      isActive: true,
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private normalizePost(p: any): NormalizedPost {
    return {
      sourceId: String(p.id),
      title: p.title?.rendered ?? '',
      content: p.content?.rendered ?? '',
      excerpt: p.excerpt?.rendered ?? '',
      author: String(p.author),
      status: p.status === 'publish' ? 'published' : 'draft',
      slug: p.slug,
      publishedAt: p.date,
      tags: [],
      seoTitle: p.yoast_head_json?.title,
      seoDescription: p.yoast_head_json?.description,
    }
  }
}
