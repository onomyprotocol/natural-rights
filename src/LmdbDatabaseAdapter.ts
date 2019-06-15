import { Env, Cursor } from 'node-lmdb'

export class LmdbDatabaseAdapter implements DatabaseAdapterInterface {
  env: any
  dbi: any

  constructor(lmdbConfig: any) {
    this.env = new Env()
    this.env.open(lmdbConfig)
    this.dbi = this.env.openDbi({
      name: 'natural-rights',
      create: true
    })
  }

  async transact(fn: (txn: any) => any) {
    const txn = this.env.beginTxn()
    try {
      const result = fn(txn)
      txn.commit()
      return result
    } catch (e) {
      txn.abort()
      throw e
    }
  }

  async cursor(fn: (txn: any, cursor: any) => any) {
    return this.transact(txn => {
      const cursor = new Cursor(txn, this.dbi)
      try {
        return fn(txn, cursor)
      } catch (e) {
        throw e
      } finally {
        cursor.close()
      }
    })
  }

  async get(soul: string) {
    if (!soul) return null
    return this.transact(txn => {
      const data = this.deserialize(txn.getStringUnsafe(this.dbi, soul))
      return data
    })
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
    if (!data) return this.delete(soul)

    return this.transact(txn => {
      txn.putString(this.dbi, soul, this.serialize(data))
    })
  }

  async delete(soul: string) {
    if (!soul) return
    return this.transact(txn => {
      txn.del(this.dbi, soul)
    })
  }

  async getDocumentGrants(documentSoul: string) {
    return this.cursor((txn, cursor) => {
      cursor.goToKey(documentSoul)
      const grantRe = new RegExp(`${documentSoul}/grants/`)
      let soul = cursor.goToNext()

      const grants: GrantRecord[] = []

      while (grantRe.test(soul)) {
        grants.push(this.deserialize(txn.getStringUnsafe(this.dbi, soul)))
        soul = cursor.goToNext()
      }

      return grants.filter(grant => !!grant)
    })
  }

  close() {
    this.dbi.close()
    this.env.close()
  }
}
