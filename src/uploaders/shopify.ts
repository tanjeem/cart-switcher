import axios, { AxiosInstance } from 'axios'
import type { ShopifyCredentials } from '@/types'

const SHOPIFY_API_VERSION = '2024-10'

// Shopify REST Admin API: 2 requests/second leaky bucket (40 burst)
// We sleep 500ms between writes to stay safely under the limit
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export class ShopifyUploader {
  private client: AxiosInstance

  constructor(private creds: ShopifyCredentials) {
    const domain = creds.domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
    this.client = axios.create({
      baseURL: `https://${domain}/admin/api/${SHOPIFY_API_VERSION}`,
      headers: {
        'X-Shopify-Access-Token': creds.accessToken,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    })

    // Retry on 429, throw readable error on others
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.client.interceptors.response.use(undefined, async (error: any) => {
      if (error.response?.status === 429) {
        const retryAfter = parseInt(error.response.headers['retry-after'] ?? '2', 10)
        await sleep(retryAfter * 1000)
        return this.client.request(error.config)
      }
      // Surface Shopify's actual error body
      const body = error.response?.data
      const shopifyMsg = body?.errors
        ? (typeof body.errors === 'string' ? body.errors : JSON.stringify(body.errors))
        : body?.error ?? error.message
      const status = error.response?.status ?? 'unknown'
      throw new Error(`Shopify ${status}: ${shopifyMsg}`)
    })
  }

  private parseNextPath(linkHeader: string): string {
    const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
    if (!match) return ''
    try {
      const parsed = new URL(match[1])
      return parsed.pathname.replace(/.*\/admin\/api\/[^/]+/, '') + parsed.search
    } catch { return '' }
  }

  async getAllProductIds(): Promise<number[]> {
    const ids: number[] = []
    let path = `/products.json?limit=250&fields=id`
    while (path) {
      const res = await this.client.get(path)
      for (const p of (res.data.products ?? [])) ids.push(p.id)
      path = this.parseNextPath(res.headers['link'] ?? '')
    }
    return ids
  }

  async getAllCustomerIds(): Promise<number[]> {
    const ids: number[] = []
    let path = `/customers.json?limit=250&fields=id`
    while (path) {
      const res = await this.client.get(path)
      for (const c of (res.data.customers ?? [])) ids.push(c.id)
      path = this.parseNextPath(res.headers['link'] ?? '')
    }
    return ids
  }

  async getAllOrderIds(): Promise<number[]> {
    const ids: number[] = []
    let path = `/orders.json?limit=250&status=any&fields=id`
    while (path) {
      const res = await this.client.get(path)
      for (const o of (res.data.orders ?? [])) ids.push(o.id)
      path = this.parseNextPath(res.headers['link'] ?? '')
    }
    return ids
  }

  async deleteProduct(id: number): Promise<void> {
    await this.client.delete(`/products/${id}.json`)
    await sleep(500)
  }

  async deleteCustomer(id: number): Promise<void> {
    await this.client.delete(`/customers/${id}.json`)
    await sleep(500)
  }

  async deleteOrder(id: number): Promise<void> {
    await this.client.delete(`/orders/${id}.json`)
    await sleep(500)
  }

  async getExistingOrderSourceIds(): Promise<Set<string>> {
    const existing = new Set<string>()
    let path = `/orders.json?limit=250&status=any&fields=id,note_attributes`

    while (path) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await this.client.get(path)
      const orders: { note_attributes?: { name: string; value: string }[] }[] = res.data.orders ?? []

      for (const order of orders) {
        const attr = order.note_attributes?.find(a => a.name === 'wc_order_id')
        if (attr) existing.add(attr.value)
      }

      // Follow Shopify's Link header for next page
      const link: string = res.headers['link'] ?? ''
      const match = link.match(/<([^>]+)>;\s*rel="next"/)
      if (match) {
        try {
          const parsed = new URL(match[1])
          path = parsed.pathname.replace(/.*\/admin\/api\/[^/]+/, '') + parsed.search
        } catch { path = '' }
      } else {
        path = ''
      }
    }

    return existing
  }

  async validate(): Promise<boolean> {
    try {
      await this.client.get('/shop.json')
      return true
    } catch {
      return false
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async createProduct(payload: any): Promise<void> {
    await this.client.post('/products.json', { product: payload })
    await sleep(500)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async createCustomer(payload: any): Promise<void> {
    try {
      await this.client.post('/customers.json', { customer: payload })
    } catch (err: any) {
      // If email already taken, find and update the existing customer
      const emailTaken = err.message?.includes('already been taken') || err.response?.data?.errors?.email
      if (emailTaken && payload.email) {
        const search = await this.client.get('/customers/search.json', { params: { query: `email:${payload.email}`, limit: 1 } })
        const existing = search.data.customers?.[0]
        if (existing) {
          await this.client.put(`/customers/${existing.id}.json`, { customer: payload })
        }
      } else {
        throw err
      }
    }
    await sleep(500)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async createOrder(payload: any): Promise<void> {
    await this.client.post('/orders.json', { order: payload })
    await sleep(500)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async createDiscountCode(payload: any): Promise<void> {
    // Create a price rule first, then attach the discount code
    const priceRuleRes = await this.client.post('/price_rules.json', {
      price_rule: payload.priceRule,
    })
    const priceRuleId = priceRuleRes.data.price_rule.id
    await sleep(500)

    await this.client.post(`/price_rules/${priceRuleId}/discount_codes.json`, {
      discount_code: { code: payload.code },
    })
    await sleep(500)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async createArticle(payload: any): Promise<void> {
    // Ensure blog exists
    const blogId = await this.getOrCreateBlog('News')
    await this.client.post(`/blogs/${blogId}/articles.json`, { article: payload })
    await sleep(500)
  }

  private blogIdCache: number | null = null

  private async getOrCreateBlog(title: string): Promise<number> {
    if (this.blogIdCache) return this.blogIdCache

    const res = await this.client.get('/blogs.json')
    const blogs: { id: number; title: string }[] = res.data.blogs

    const existing = blogs.find(b => b.title === title)
    if (existing) {
      this.blogIdCache = existing.id
      return existing.id
    }

    const created = await this.client.post('/blogs.json', { blog: { title } })
    this.blogIdCache = created.data.blog.id
    return this.blogIdCache!
  }
}
