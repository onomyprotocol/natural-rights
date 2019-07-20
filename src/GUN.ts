import { Client } from './Client'
import { SEA } from './SEA'

const Gun = require('gun/gun')

function toNode(soul: string, data: any) {
  const now = Gun.time.is()
  const state = Object.keys(data).reduce(
    (s, key) => ({
      ...s,
      [key]: now
    }),
    {}
  )

  const meta = {
    '#': soul,
    '>': state
  }

  return {
    ...data,
    _: meta
  }
}

async function toSignedNode(client: Client, documentId: string, data: any) {
  const soul = `nr/doc/v1~${documentId}.`
  const unsigned = toNode(soul, data)
  const keys = Object.keys(data)
  const plaintexts = keys.map(key => data[key])
  const ciphertexts = await client.encryptDocumentTexts(documentId, plaintexts)
  const encrypted = keys.reduce(
    (res, key, idx) => ({
      ...res,
      [key]: Gun.SEA.opt.parse(ciphertexts[idx])
    }),
    unsigned
  )
  const hashes = await Promise.all(keys.map(key => SEA.hashNodeKey(encrypted, key)))
  const signatures = await client.signDocumentHashes(documentId, hashes)
  const signed = keys.reduce(
    (res, key, idx) => ({
      ...res,
      [key]: JSON.stringify({ ':': encrypted[key], '~': signatures[idx] })
    }),
    encrypted
  )
  return signed
}

export const GUN = {
  toNode,
  toSignedNode
}
