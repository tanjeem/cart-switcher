import type {
  NormalizedProduct,
  NormalizedCustomer,
  NormalizedOrder,
  NormalizedCoupon,
  NormalizedPost,
} from '@/types'

export function transformProduct(p: NormalizedProduct) {
  return {
    title: p.title,
    handle: p.slug,   // explicit handle lets us find the product by handle on retry
    body_html: p.description,
    vendor: p.vendor || 'Default',
    product_type: p.productType,
    // cartswitcher-migrated tag lets us identify our own products for safe dedup
    tags: [...p.tags, ...p.categories, 'cartswitcher-migrated'].join(', '),
    status: p.status,
    metafields_global_title_tag: p.seoTitle,
    metafields_global_description_tag: p.seoDescription,
    variants: p.variants.map(v => ({
      sku: v.sku,
      price: v.price,
      compare_at_price: v.compareAtPrice ?? null,
      weight: v.weight ?? 0,
      weight_unit: v.weightUnit ?? 'kg',
      inventory_quantity: v.inventory,
      inventory_management: 'shopify',
      requires_shipping: v.requiresShipping,
      taxable: v.taxable,
      // option1 must always be set — Shopify rejects null when options are defined
      option1: v.option1 ?? 'Default Title',
      ...(v.option2 ? { option2: v.option2 } : {}),
      ...(v.option3 ? { option3: v.option3 } : {}),
    })),
    images: p.images.map(img => ({
      src: img.src,
      alt: img.alt ?? '',
      position: img.position,
    })),
    options: buildOptions(p),
  }
}

function buildOptions(p: NormalizedProduct) {
  if (p.variants.length <= 1 && !p.variants[0]?.option1) {
    return [{ name: 'Title', values: ['Default Title'] }]
  }

  const opt1Values = [...new Set(p.variants.map(v => v.option1).filter(Boolean))]
  const opt2Values = [...new Set(p.variants.map(v => v.option2).filter(Boolean))]
  const opt3Values = [...new Set(p.variants.map(v => v.option3).filter(Boolean))]

  const options = []
  if (opt1Values.length) options.push({ name: 'Option 1', values: opt1Values })
  if (opt2Values.length) options.push({ name: 'Option 2', values: opt2Values })
  if (opt3Values.length) options.push({ name: 'Option 3', values: opt3Values })
  return options
}

export function transformCustomer(c: NormalizedCustomer) {
  return {
    first_name: c.firstName,
    last_name: c.lastName,
    email: c.email,
    // Sanitize phone — Shopify rejects invalid numbers with a 422
    phone: sanitizePhone(c.phone),
    accepts_marketing: c.acceptsMarketing,
    note: c.note ?? null,
    addresses: c.addresses.map(a => ({
      first_name: a.firstName,
      last_name: a.lastName,
      address1: a.address1,
      address2: a.address2 ?? '',
      city: a.city,
      province: a.province ?? '',
      zip: a.zip,
      country: a.country,
      // Sanitize address phone too
      phone: sanitizePhone(a.phone),
      default: a.isDefault ?? false,
    })),
  }
}

function sanitizePhone(phone?: string): string | null {
  if (!phone) return null
  const trimmed = phone.trim()
  // Already has explicit + country code prefix → strip non-digits and keep
  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '')
    return digits.length >= 7 ? `+${digits}` : null
  }
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length < 7) return null
  // Leading 0 means local format — country code unknown, drop it to avoid invalid E.164
  if (digits.startsWith('0')) return null
  return `+${digits}`
}

export function transformOrder(o: NormalizedOrder) {
  return {
    email: o.email,
    phone: sanitizePhone(o.phone),
    // Include name from billing so the order shows a name, not just the email
    customer: {
      email: o.email,
      first_name: o.billingAddress?.firstName || o.shippingAddress?.firstName || '',
      // Shopify 422s when last_name is blank — fall back to '.' rather than fail
      last_name: (o.billingAddress?.lastName || o.shippingAddress?.lastName)?.trim() || '.',
    },
    note: o.note ?? null,
    financial_status: o.financialStatus,
    fulfillment_status: o.fulfillmentStatus,
    currency: o.currency,
    processed_at: o.processedAt,
    created_at: o.createdAt,
    ...(o.tags?.length ? { tags: o.tags.join(', ') } : {}),
    line_items: o.lineItems.map(li => ({
      title: li.title,
      variant_title: li.variantTitle ?? null,
      sku: li.sku ?? null,
      quantity: li.quantity,
      price: li.price,
      total_discount: li.totalDiscount,
      taxable: li.taxable,
      requires_shipping: true,
    })),
    shipping_address: o.shippingAddress ? {
      first_name: o.shippingAddress.firstName,
      last_name: o.shippingAddress.lastName,
      address1: o.shippingAddress.address1,
      address2: o.shippingAddress.address2 ?? '',
      city: o.shippingAddress.city,
      province: o.shippingAddress.province ?? '',
      zip: o.shippingAddress.zip,
      country: o.shippingAddress.country,
      phone: sanitizePhone(o.shippingAddress.phone),
    } : null,
    billing_address: o.billingAddress ? {
      first_name: o.billingAddress.firstName,
      last_name: o.billingAddress.lastName,
      address1: o.billingAddress.address1,
      address2: o.billingAddress.address2 ?? '',
      city: o.billingAddress.city,
      province: o.billingAddress.province ?? '',
      zip: o.billingAddress.zip,
      country: o.billingAddress.country,
      phone: sanitizePhone(o.billingAddress.phone),
    } : null,
    // Used for deduplication on retry — lets us find already-migrated orders
    note_attributes: [{ name: 'wc_order_id', value: o.sourceId }],
    discount_codes: o.discountCodes.map(code => ({
      code,
      amount: '0',
      type: 'fixed_amount',
    })),
    // Historical orders don't send confirmation emails
    send_receipt: false,
    send_fulfillment_receipt: false,
    inventory_behaviour: 'bypass',
  }
}

export function transformCoupon(c: NormalizedCoupon) {
  const valueType = c.type === 'percentage' ? 'percentage' : 'fixed_amount'

  return {
    code: c.code.toUpperCase(),
    priceRule: {
      title: c.code.toUpperCase(),
      target_type: 'line_item',
      target_selection: 'all',
      allocation_method: 'across',
      value_type: valueType,
      value: `-${c.value}`,
      customer_selection: 'all',
      starts_at: new Date().toISOString(),
      ends_at: c.expiresAt ?? null,
      usage_limit: c.usageLimit ?? null,
      minimum_subtotal_amount: c.minimumOrderAmount ?? '0.00',
    },
  }
}

export function transformPost(p: NormalizedPost) {
  return {
    title: p.title,
    body_html: p.content,
    summary_html: p.excerpt ?? '',
    handle: p.slug,
    published: p.status === 'published',
    published_at: p.publishedAt ?? new Date().toISOString(),
    metafields: [
      p.seoTitle && {
        key: 'title_tag',
        value: p.seoTitle,
        type: 'single_line_text_field',
        namespace: 'global',
      },
      p.seoDescription && {
        key: 'description_tag',
        value: p.seoDescription,
        type: 'single_line_text_field',
        namespace: 'global',
      },
    ].filter(Boolean),
  }
}
