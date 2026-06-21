import axios, { AxiosInstance } from 'axios'
import type { ShopifyCredentials } from '@/types'

const SHOPIFY_API_VERSION = '2024-10'

// Set to false to fall back to REST if GraphQL mutations have issues.
// REST: 2 req/s hard limit. GraphQL: ~5 mutations/s (cost-based throttle).
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private restAddrToGql(a: any) {
    if (!a) return null
    return {
      firstName: a.first_name ?? '',
      lastName: a.last_name ?? '',
      address1: a.address1 ?? '',
      address2: a.address2 || null,
      city: a.city ?? '',
      province: a.province || null,
      zip: a.zip ?? '',
      country: a.country ?? '',
      phone: a.phone || null,
    }
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
    return USE_GRAPHQL ? this.createOrderGql(payload) : this.createOrderRest(payload)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async createOrderGql(payload: any): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buildOrder = (p: any, withPhone = true) => ({
      email: p.email,
      phone: withPhone ? (p.phone || null) : null,
      financialStatus: (p.financial_status ?? 'pending').toUpperCase(),
      ...(p.fulfillment_status ? { fulfillmentStatus: p.fulfillment_status.toUpperCase() } : {}),
      currencyCode: p.currency ?? 'USD',
      note: p.note || null,
      processedAt: p.processed_at ?? p.created_at,
      tags: p.tags
        ? (typeof p.tags === 'string' ? p.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : p.tags)
        : [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lineItems: (p.line_items ?? []).map((li: any) => ({
        title: li.title,
        ...(li.variant_title ? { variantTitle: li.variant_title } : {}),
        ...(li.sku ? { sku: li.sku } : {}),
        quantity: li.quantity ?? 1,
        priceSet: { shopMoney: { amount: String(li.price ?? '0.00'), currencyCode: p.currency ?? 'USD' } },
        taxable: li.taxable ?? true,
        requiresShipping: li.requires_shipping ?? true,
      })),
      shippingAddress: withPhone ? this.restAddrToGql(p.shipping_address) : this.restAddrToGql({ ...p.shipping_address, phone: null }),
      billingAddress: withPhone ? this.restAddrToGql(p.billing_address) : this.restAddrToGql({ ...p.billing_address, phone: null }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      noteAttributes: (p.note_attributes ?? []).map((a: any) => ({ name: a.name, value: String(a.value) })),
      customer: p.email ? { email: p.email } : undefined,
    })

    const MUTATION = `
      mutation orderCreate($order: OrderCreateOrderInput!, $options: OrderCreateOptionsInput) {
        orderCreate(order: $order, options: $options) {
          order { id }
          userErrors { field message }
        }
      }`

    const options = { inventoryBehaviour: 'BYPASS', sendReceipt: false, sendFulfillmentReceipt: false }

    const tryCreate = async (order: Record<string, unknown>) => {
      const data = await this.gql(MUTATION, { order, options })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errors: { field: string[]; message: string }[] = data.orderCreate.userErrors
      if (!errors.length) return

      const phoneBad = errors.some(e =>
        e.field?.some(f => f.toLowerCase().includes('phone')) || e.message?.toLowerCase().includes('phone')
      )
      if (phoneBad) {
        const retryData = await this.gql(MUTATION, { order: buildOrder(payload, false), options })
        const retryErrors = retryData.orderCreate.userErrors
        if (retryErrors.length) throw new Error(retryErrors.map((e: { message: string }) => e.message).join('; '))
      } else {
        throw new Error(errors.map(e => `${e.field?.join('.')}: ${e.message}`).join('; '))
      }
    }

    await tryCreate(buildOrder(payload))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async createOrderRest(payload: any): Promise<void> {
    try {
      await this.client.post('/orders.json', { order: payload })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('phone') && (msg.includes('is invalid') || msg.includes('already been taken'))) {
        const cleanedBilling = payload.billing_address ? { ...payload.billing_address, phone: null } : payload.billing_address
        const cleanedShipping = payload.shipping_address ? { ...payload.shipping_address, phone: null } : payload.shipping_address
        await this.client.post('/orders.json', {
          order: { ...payload, phone: null, billing_address: cleanedBilling, shipping_address: cleanedShipping },
        })
      } else {
        throw err
      }
    }
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
