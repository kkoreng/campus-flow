import { MongoClient, type Db } from 'mongodb'

export const USE_MONGO = Boolean(process.env.MONGODB_URI)

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

let clientPromise: Promise<MongoClient> | null = null

if (USE_MONGO) {
  const uri = process.env.MONGODB_URI!
  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = new MongoClient(uri).connect()
    }
    clientPromise = global._mongoClientPromise
  } else {
    clientPromise = new MongoClient(uri).connect()
  }
}

export async function getDb(): Promise<Db> {
  if (!clientPromise) throw new Error('MongoDB is not configured')
  const client = await clientPromise
  return client.db('campusflow')
}
