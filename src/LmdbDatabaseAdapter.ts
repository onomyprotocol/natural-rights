import lmdb from 'node-lmdb'

const DEFAULT_CONFIG = {
  path: './'
}

export class LmdbDatabaseAdapter implements DatabaseAdapterInterface {
  env: any
  dbi: any

  constructor(lmdbConfig = DEFAULT_CONFIG) {
    this.env = new lmdb.Env()
    this.env.open(lmdbConfig)
    this.dbi = this.env.openDbi({
      name: 'natural-rights',
      create: true
    })
  }

  async get(soul: string) {
    if (!soul) return null
    const txn = this.env.beginTxn()
    try {
      const data = this.deserialize(txn.getStringUnsafe(this.dbi, soul))
      txn.commit()
      return data
    } catch (e) {
      txn.abort()
      throw e
    }
  }

  serialize(node: DatabaseRecord) {
    if (!node) return ''
    return JSON.stringify(node)
  }

  deserialize(data: string) {
    return JSON.parse(data)
  }

  async put(soul: string, data: DatabaseRecord) {
    if (!soul) return
    const txn = this.env.beginTxn()

    try {
      // TODO: delete if data is null
      txn.putString(this.dbi, soul, this.serialize(data))
      txn.commit()
    } catch (e) {
      txn.abort()
      throw e
    }
  }

  async delete(soul: string) {
    if (!soul) return
    const txn = this.env.beginTxn()
    try {
      txn.delete(soul)
      txn.commit()
    } catch (e) {
      txn.abort()
      throw e
    }
  }

  close() {
    this.dbi.close()
    this.env.close()
  }
}
