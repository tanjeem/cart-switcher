const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const jobs = await prisma.migrationJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1
  })
  const job = jobs[0]
  const domain = job.shopifyDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const token = job.shopifyAccessToken

  async function gql(query, variables) {
    const res = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables })
    })
    return res.json()
  }

  const start = await gql(`
    mutation {
      bulkOperationRunQuery(
        query: """
          {
            products {
              edges {
                node {
                  id
                  title
                }
              }
            }
          }
        """
      ) {
        bulkOperation {
          id
          status
        }
        userErrors {
          field
          message
        }
      }
    }
  `)

  console.log('Start:', JSON.stringify(start, null, 2))

  if (start.data?.bulkOperationRunQuery?.bulkOperation?.id) {
    const id = start.data.bulkOperationRunQuery.bulkOperation.id
    console.log('Querying node for ID:', id)
    
    const check = await gql(`
      query bulkOp($id: ID!) {
        node(id: $id) {
          ... on BulkOperation {
            id status errorCode url objectCount
          }
        }
      }
    `, { id })
    console.log('Check:', JSON.stringify(check, null, 2))
  }
}
main().catch(console.error).finally(() => prisma.$disconnect())
