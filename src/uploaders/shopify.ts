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

  // ── Deduplication helpers ─────────────────────────────────────────────────
  // These methods only look at items tagged/attributed by CartSwitcher, so they
  // never touch products/orders the merchant created themselves.

  // Returns IDs of duplicate CartSwitcher products (extras beyond one per handle).
  // Identified by the 'cartswitcher-migrated' tag added during migration.
  async getCartSwitcherProductDuplicates(): Promise<number[]> {
    const byHandle = new Map<string, number[]>()
    let path = `/products.json?limit=250&fields=id,handle,tags`
    while (path) {
      const res = await this.client.get(path)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const p of (res.data.products ?? []) as any[]) {
        const tags: string[] = (p.tags ?? '').split(',').map((t: string) => t.trim())
        if (!tags.includes('cartswitcher-migrated')) continue
        const list = byHandle.get(p.handle) ?? []
        list.push(p.id)
        byHandle.set(p.handle, list)
      }
      path = this.parseNextPath(res.headers['link'] ?? '')
    }
    const toDelete: number[] = []
    for (const ids of byHandle.values()) {
      if (ids.length > 1) {
        ids.sort((a, b) => a - b) // keep lowest ID (oldest), delete the rest
        toDelete.push(...ids.slice(1))
      }
    }
    return toDelete
  }

  // Returns IDs of duplicate CartSwitcher orders (extras beyond one per wc_order_id).
  // Identified by the note_attributes[wc_order_id] added during migration.
  async getCartSwitcherOrderDuplicates(): Promise<number[]> {
    const byWcId = new Map<string, number[]>()
    let path = `/orders.json?limit=250&status=any&fields=id,note_attributes`
    while (path) {
      const res = await this.client.get(path)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const o of (res.data.orders ?? []) as any[]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const attr = (o.note_attributes ?? []).find((a: any) => a.name === 'wc_order_id')
        if (!attr) continue
        const list = byWcId.get(attr.value) ?? []
        list.push(o.id)
        byWcId.set(attr.value, list)
      }
      path = this.parseNextPath(res.headers['link'] ?? '')
    }
    const toDelete: number[] = []
    for (const ids of byWcId.values()) {
      if (ids.length > 1) {
        ids.sort((a, b) => a - b) // keep oldest, delete the rest
        toDelete.push(...ids.slice(1))
      }
    }
    return toDelete
  }

  // ── Delete helpers ────────────────────────────────────────────────────────

  async deleteProduct(id: number): Promise<void> {
    await this.client.delete(`/products/${id}.json`)
    await sleep(500)
  }

  async deleteOrder(id: number): Promise<void> {
    await this.client.delete(`/orders/${id}.json`)
    await sleep(500)
  }

  // ── Existing-order snapshot for skip-on-retry ─────────────────────────────

  async getExistingOrderSourceIds(): Promise<Set<string>> {
    const existing = new Set<string>()
    let path = `/orders.json?limit=250&status=any&fields=id,note_attributes`
    while (path) {
      const res = await this.client.get(path)
      const orders: { note_attributes?: { name: string; value: string }[] }[] = res.data.orders ?? []
      for (const order of orders) {
        const attr = order.note_attributes?.find(a => a.name === 'wc_order_id')
        if (attr) existing.add(attr.value)
      }
      path = this.parseNextPath(res.headers['link'] ?? '')
    }
    return existing
  }

  // ── Validation ────────────────────────────────────────────────────────────

  async validate(): Promise<boolean> {
    try {
      await this.client.get('/shop.json')
      return true
    } catch {
      return false
    }
  }

  // ── Upload methods ────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async createProduct(payload: any): Promise<void> {
    try {
      await this.client.post('/products.json', { product: payload })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      // Handle already taken — find by explicit handle and UPDATE instead of failing
      if (msg.includes('handle') && msg.includes('already been taken') && payload.handle) {
        const search = await this.client.get('/products.json', {
          params: { handle: payload.handle, limit: 1, fields: 'id' },
        })
        const existing = search.data.products?.[0]
        if (existing) {
          await this.client.put(`/products/${existing.id}.json`, { product: payload })
        }
      } else {
        throw err
      }
    }
    await sleep(500)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async createCustomer(payload: any): Promise<void> {
    try {
      await this.client.post('/customers.json', { customer: payload })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      const emailTaken = msg.includes('already been taken')
      if (emailTaken && payload.email) {
        const search = await this.client.get('/customers/search.json', {
          params: { query: `email:${payload.email}`, limit: 1 },
        })
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
    if (existing) { this.blogIdCache = existing.id; return existing.id }
    const created = await this.client.post('/blogs.json', { blog: { title } })
    this.blogIdCache = created.data.blog.id
    return this.blogIdCache!
  }
}
