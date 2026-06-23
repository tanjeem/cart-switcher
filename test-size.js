const fs = require('fs')
const o = {
  id: "2115",
  status: "completed",
  date_created: "2026-06-22T12:00:00Z",
  total: "123.00",
  currency: "USD",
  line_items: [ { id: "123", name: "Product", quantity: 1, price: "123.00", sku: "", product_id: "99" } ],
  customer_id: "5",
  billing: { first_name: "John", last_name: "Doe", company: "", address_1: "123 St", address_2: "", city: "City", state: "NY", postcode: "10001", country: "US", email: "john@example.com", phone: "1234567890" },
  shipping: { first_name: "John", last_name: "Doe", company: "", address_1: "123 St", address_2: "", city: "City", state: "NY", postcode: "10001", country: "US" }
}
const arr = Array(1548).fill(o)
const str = JSON.stringify(arr)
console.log('Size:', str.length, 'bytes')
