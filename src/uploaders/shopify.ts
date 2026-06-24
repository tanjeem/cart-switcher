import axios, { AxiosInstance } from 'axios'
import type { ShopifyCredentials } from '@/types'

const SHOPIFY_API_VERSION = '2024-10'

// GraphQL customers: ~5 mutations/s vs REST's 2 req/s.
const USE_GRAPHQL = true

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.client.interceptors.response.use(async (response: any) => {
      // Adaptive REST throttling: read bucket state from every response header.
      // Shopify REST bucket: 40 capacity, restores at 2/s.
      // Sleep only when headroom is low — lets us use burst capacity instead of
      // always sleeping a fixed 500ms regardless of bucket state.
      const limitHeader = response.headers['x-shopify-api-call-limit'] as string | undefined
      if (limitHeader) {
        const [usedStr, maxStr] = limitHeader.split('/')
        const available = parseInt(maxStr, 10) - parseInt(usedStr, 10)
        if (available < 5) {
          await sleep((5 - available) * 500)
        }
      }
      return response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }, async (error: any) => {
      if (error.response?.status === 429) {
        const retries = (error.config?._429retries ?? 0) as number
        // Exponential backoff: 1s → 2s → 4s → 8s → 8s (capped). Total ≤ 23s < ORDER_TIMEOUT (30s).
        // Fixed short delays (3s) failed because other apps on this store consume
        // every refilled token immediately — 3s only restores 6 tokens which competing
        // apps take before we can retry. The 8s cap gives the bucket a real recovery
        // window: 8s × 2 tok/s = 16 tokens refilled vs ~14 consumed by others = net +2.
        if (retries >= 5) throw new Error('Shopify 429: rate limit exceeded after 5 retries')
        const retryAfter = parseInt(error.response.headers['retry-after'] ?? '0', 10)
        const expBackoff = Math.min(8000, Math.pow(2, retries) * 1000)
        const delayMs = Math.max(expBackoff, retryAfter > 0 ? retryAfter * 1000 : 0)
        await sleep(delayMs)
        return this.client.request({ ...error.config, _429retries: retries + 1 })
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

  // ── Product duplicate scanner (by title, any origin) ─────────────────────
  // Groups ALL Shopify products by lowercase title. Returns every group that
  // has more than one product, with IDs sorted oldest→newest so callers know
  // which one to keep (lowest ID = oldest).
  async getAllProductDuplicatesByTitle(): Promise<{
    title: string
    image?: string
    ids: number[]   // sorted oldest→newest; keep ids[0], delete the rest
  }[]> {
    const byTitle = new Map<string, { id: number; title: string; image?: string }[]>()
    let path = `/products.json?limit=250&fields=id,title,images`
    while (path) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await this.client.get(path)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const p of (res.data.products ?? []) as any[]) {
        const key = (p.title ?? '').trim().toLowerCase()
        if (!key) continue
        const list = byTitle.get(key) ?? []
        list.push({ id: p.id, title: p.title, image: p.images?.[0]?.src })
        byTitle.set(key, list)
      }
      path = this.parseNextPath(res.headers['link'] ?? '')
    }
    const result: { title: string; image?: string; ids: number[] }[] = []
    for (const items of byTitle.values()) {
      if (items.length > 1) {
        items.sort((a, b) => a.id - b.id)
        result.push({ title: items[0].title, image: items[0].image, ids: items.map(i => i.id) })
      }
    }
    return result.sort((a, b) => a.title.localeCompare(b.title))
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

  async deleteCustomer(id: number): Promise<void> {
    await this.client.delete(`/customers/${id}.json`)
    await sleep(500)
  }

  // ── Bulk ID scans (for management / delete-all) ───────────────────────────

  async getAllProductIds(): Promise<number[]> {
    const ids: number[] = []
    let path = `/products.json?limit=250&fields=id`
    while (path) {
      const res = await this.client.get(path)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const p of (res.data.products ?? []) as any[]) ids.push(p.id)
      path = this.parseNextPath(res.headers['link'] ?? '')
    }
    return ids
  }

  async getAllCustomerIds(): Promise<number[]> {
    const ids: number[] = []
    let path = `/customers.json?limit=250&fields=id`
    while (path) {
      const res = await this.client.get(path)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const c of (res.data.customers ?? []) as any[]) ids.push(c.id)
      path = this.parseNextPath(res.headers['link'] ?? '')
    }
    return ids
  }

  async getAllOrderIds(): Promise<number[]> {
    const ids: number[] = []
    let path = `/orders.json?limit=250&status=any&fields=id`
    while (path) {
      const res = await this.client.get(path)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const o of (res.data.orders ?? []) as any[]) ids.push(o.id)
      path = this.parseNextPath(res.headers['link'] ?? '')
    }
    return ids
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

  // ── GraphQL helper ────────────────────────────────────────────────────────
  // Sends a GraphQL mutation and applies adaptive throttling based on the
  // cost extensions Shopify returns. Much more efficient than a fixed sleep.

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async gql(query: string, variables: Record<string, unknown> = {}): Promise<any> {
    const res = await this.client.post('/graphql.json', { query, variables })

    if (res.data.errors?.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      throw new Error(`GraphQL: ${res.data.errors.map((e: any) => e.message).join('; ')}`)
    }

    // Adaptive throttle: wait proportionally when bucket is running low
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const throttle = res.data.extensions?.cost?.throttleStatus as any
    const cost = (res.data.extensions?.cost?.actualQueryCost ?? 10) as number
    if (throttle && throttle.currentlyAvailable < cost * 2) {
      const deficit = cost * 2 - throttle.currentlyAvailable
      const waitMs = Math.ceil((deficit / throttle.restoreRate) * 1000)
      await sleep(Math.min(waitMs, 5000))
    }

    return res.data.data
  }

  // ── createCustomer ────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async createCustomer(payload: any): Promise<void> {
    return USE_GRAPHQL ? this.createCustomerGql(payload) : this.createCustomerRest(payload)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async createCustomerGql(payload: any): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buildInput = (data: any, withPhone = true) => ({
      firstName: data.first_name ?? '',
      lastName: data.last_name ?? '',
      email: data.email,
      phone: withPhone ? (data.phone || null) : null,
      emailMarketingConsent: { marketingState: (data.accepts_marketing ?? false) ? 'SUBSCRIBED' : 'UNSUBSCRIBED' },
      note: data.note || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      addresses: data.addresses?.map((a: any) => ({
        firstName: a.first_name ?? '',
        lastName: a.last_name ?? '',
        address1: a.address1 ?? '',
        address2: a.address2 || null,
        city: a.city ?? '',
        province: a.province || null,
        zip: a.zip ?? '',
        country: a.country ?? '',
        phone: withPhone ? (a.phone || null) : null,
      })) ?? [],
    })

    const CREATE = `
      mutation customerCreate($input: CustomerInput!) {
        customerCreate(input: $input) {
          customer { id }
          userErrors { field message }
        }
      }`

    const tryGqlCreate = async (input: Record<string, unknown>) => {
      const data = await this.gql(CREATE, { input })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errors: { field: string[]; message: string }[] = data.customerCreate.userErrors

      if (!errors.length) return

      const phoneBad = errors.some(e =>
        e.field?.some(f => f.includes('phone')) || e.message?.toLowerCase().includes('phone')
      )
      const emailTaken = !phoneBad && errors.some(e => e.message?.includes('already been taken'))

      if (phoneBad) {
        // Retry without phone
        const retryData = await this.gql(CREATE, { input: { ...input, phone: null, addresses: (input.addresses as [])?.map((a: Record<string, unknown>) => ({ ...a, phone: null })) } })
        const retryErrors = retryData.customerCreate.userErrors
        if (retryErrors.length && !retryErrors.every((e: { message: string }) => e.message?.includes('already been taken'))) {
          throw new Error(retryErrors.map((e: { message: string }) => e.message).join('; '))
        }
        if (retryErrors.some((e: { message: string }) => e.message?.includes('already been taken'))) {
          await this.upsertCustomerGql(payload.email, { ...input, phone: null })
        }
      } else if (emailTaken) {
        await this.upsertCustomerGql(payload.email, input)
      } else {
        throw new Error(errors.map(e => e.message).join('; '))
      }
    }

    await tryGqlCreate(buildInput(payload))
  }

  private async upsertCustomerGql(email: string, input: Record<string, unknown>): Promise<void> {
    // Look up existing customer ID via REST search (cheaper than GQL query)
    const search = await this.client.get('/customers/search.json', {
      params: { query: `email:${email}`, limit: 1 },
    })
    const existing = search.data.customers?.[0]
    if (!existing) return

    const gid = `gid://shopify/Customer/${existing.id}`
    // emailMarketingConsent is not accepted by customerUpdate — strip it
    const { emailMarketingConsent: _emc, ...updateInput } = input
    const UPDATE = `
      mutation customerUpdate($input: CustomerInput!) {
        customerUpdate(input: $input) {
          customer { id }
          userErrors { field message }
        }
      }`
    const data = await this.gql(UPDATE, { input: { ...updateInput, id: gid } })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errors: { message: string }[] = data.customerUpdate.userErrors
    if (errors.length) {
      // If phone still bad on update, retry without it
      const phoneBad = errors.some(e => e.message?.toLowerCase().includes('phone'))
      if (phoneBad) {
        await this.gql(UPDATE, { input: { ...updateInput, id: gid, phone: null } })
      } else {
        throw new Error(errors.map(e => e.message).join('; '))
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async createCustomerRest(payload: any): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tryCreate = async (data: any) => {
      try {
        await this.client.post('/customers.json', { customer: data })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        const emailTaken = msg.includes('already been taken') && !msg.includes('phone')
        const phoneBad = msg.includes('phone') && (msg.includes('already been taken') || msg.includes('is invalid'))

        if (phoneBad) {
          const { phone: _p, ...rest } = data; void _p
          await this.client.post('/customers.json', { customer: rest })
        } else if (emailTaken && data.email) {
          const search = await this.client.get('/customers/search.json', { params: { query: `email:${data.email}`, limit: 1 } })
          const existing = search.data.customers?.[0]
          if (existing) {
            try {
              await this.client.put(`/customers/${existing.id}.json`, { customer: data })
            } catch (putErr: unknown) {
              const putMsg = putErr instanceof Error ? putErr.message : String(putErr)
              if (putMsg.includes('phone') && (putMsg.includes('already been taken') || putMsg.includes('is invalid'))) {
                const { phone: _p, ...rest } = data; void _p
                await this.client.put(`/customers/${existing.id}.json`, { customer: rest })
              } else throw putErr
            }
          }
        } else throw err
      }
    }
    await tryCreate(payload)
    await sleep(500)
  }

  // ── createOrder ───────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async createOrder(payload: any): Promise<void> {
    return this.createOrderRest(payload)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async createOrderRest(payload: any): Promise<void> {
    const tryPost = async (order: Record<string, unknown>) => {
      try {
        await this.client.post('/orders.json', { order })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('phone') && (msg.includes('is invalid') || msg.includes('already been taken'))) {
          await this.client.post('/orders.json', {
            order: { ...order, phone: null, billing_address: order.billing_address ? { ...(order.billing_address as object), phone: null } : null, shipping_address: order.shipping_address ? { ...(order.shipping_address as object), phone: null } : null },
          })
        } else if (msg.includes('shipping_address')) {
          await this.client.post('/orders.json', { order: { ...order, shipping_address: null } })
        } else {
          throw err
        }
      }
    }
    const t0 = Date.now()
    await tryPost(payload)
    // Enforce a minimum 2000ms per order (~0.5 req/s sustained).
    // Shopify's bucket restores at 2/s — leaving 1.5 tokens/s of headroom for
    // other apps sharing the bucket. At 1200ms (0.83 req/s) we still saw consistent
    // 429s because competing apps on this store consume ~1.5+ tokens/s, leaving
    // insufficient headroom. 2000ms halves our rate and gives the bucket real slack.
    const elapsed = Date.now() - t0
    if (elapsed < 2000) await sleep(2000 - elapsed)
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
