import { Client } from './Client'
import { initSEA } from './SEA'

export function initGUN(Gun: any) {
  const SEA = initSEA(Gun)

  function getDocumentId(soul: string) {
    const [path, key] = soul.split('~')
    if (path !== 'nr/doc/v1') return ''
    return key.slice(0, -1)
  }

  function documentIdToSoul(documentId: string) {
    return `nr/doc/v1~${documentId}.`
  }

  function toNode(soul: string, data: any) {
    const now = Gun.time.is()
    const keys = Object.keys(data).filter(k => k !== '_')
    const state = keys.reduce(
      (s, key) => ({
        ...s,
        [key]: s[key] || now
      }),
      data.state || {}
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

  // https://github.com/amark/gun/blob/master/lib/afore.js
  function afore(tag: any, hear: any) {
    if (!tag) {
      return
    }
    tag = tag.the // grab the linked list root
    let tmp = tag.to // grab first listener
    hear = tmp.on.on(tag.tag, hear) // add us to end
    hear.to = tmp || hear.to // make our next be current first
    hear.back.to = hear.to // make our back point to our next
    tag.last = hear.back // make last be same as before
    hear.back = tag // make our back be the start
    tag.to = hear // make the start be us
    return hear
  }

  async function toSignedNode(client: Client, documentId: string, data: any) {
    const soul = documentIdToSoul(documentId)
    const unsigned = toNode(soul, data)
    const keys = Object.keys(data).filter(k => {
      if (k === '_') return false
      const val = Gun.SEA.opt.parse(unsigned[k])
      // Don't resign/encrypt things that are already signed
      return !val['~']
    })
    if (!keys.length) return unsigned
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

  async function decryptNode(client: Client, documentId: string, data: any) {
    const keys = Object.keys(data).filter(k => k !== '_')
    const ciphertexts = keys.map(key => data[key])
    // It is assumed SEA has already decoded the signature away
    try {
      const plaintexts = await client.decryptDocumentTexts(documentId, ciphertexts)
      const decrypted = keys.reduce(
        (res, key, idx) => ({
          ...res,
          [key]: Gun.SEA.opt.parse(plaintexts[idx])
        }),
        data
      )
      return { ...decrypted, decryptError: null }
    } catch (e) {
      const result = {
        ...data,
        decryptError: e
      }
      return result
    }
  }

  async function gunWireOutput(this: any, msg: any) {
    if (!msg.$) {
      this && this.to && this.to.next && this.to.next(msg)
      return
    }

    const client: Client = msg.$._.root.naturalRights.client
    const souls = Object.keys((msg && msg.put) || {})

    for (let i = 0; i < souls.length; i++) {
      const soul = souls[i]
      const docId = getDocumentId(soul)
      if (!docId) continue
      msg.put[soul] = await toSignedNode(client, docId, msg.put[soul])
    }

    this && this.to && this.to.next && this.to.next(msg)
  }

  async function gunApiOutput(this: any, msg: any) {
    const client: Client = msg.$._.root.naturalRights.client
    const soul = msg.get
    const docId = getDocumentId(soul)

    if (!docId) {
      this && this.to && this.to.next && this.to.next(msg)
      return
    }

    msg.put = await decryptNode(client, docId, msg.put)
    this && this.to && this.to.next && this.to.next(msg)
  }

  const GUN = {
    SEA,
    Gun,
    afore,
    getDocumentId,
    documentIdToSoul,
    toNode,
    toSignedNode,
    decryptNode,
    gunWireOutput,
    gunApiOutput
  }

  return GUN
}
