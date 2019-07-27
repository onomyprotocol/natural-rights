export function initSEA(Gun: any) {
  // SEA.opt
  const Buffer = Gun.SEA.Buffer
  const settings = Gun.SEA.opt

  // SEA.encrypt
  const encrypt = Gun.SEA.encrypt

  // SEA.decrypt
  const decrypt = Gun.SEA.decrypt

  const api: any = { Buffer: Gun.SEA.Buffer }

  if (Gun.SEA.window) {
    const o = {}
    const crypto = Gun.SEA.window.crypto || Gun.SEA.window.msCrypto
    api.subtle = (crypto || o).subtle || (crypto || o).webkitSubtle
    api.TextEncoder = Gun.SEA.window.TextEncoder
    api.TextDecoder = Gun.SEA.window.TextDecoder
  }

  if (!api.subtle) {
    const WebCrypto = require('node-webcrypto-ossl')
    const { TextEncoder, TextDecoder } = require('text-encoding')

    api.TextEncoder = TextEncoder
    api.TextDecoder = TextDecoder
    api.subtle = new WebCrypto({ directory: 'ossl' }).subtle // ECDH
  }

  const subtle = api.subtle

  async function sha256(d: any, o?: any) {
    let t = typeof d === 'string' ? d : JSON.stringify(d)
    let hash = await api.subtle.digest({ name: o || 'SHA-256' }, new api.TextEncoder().encode(t))
    return api.Buffer.from(hash)
  }

  const SEA = {
    async signKeyGen() {
      const keys = await subtle.generateKey(settings.ecdsa.pair, true, ['sign', 'verify'])
      const pub = await subtle.exportKey('jwk', keys.publicKey)

      return {
        pubKey: pub.x + '.' + pub.y,
        privKey: (await subtle.exportKey('jwk', keys.privateKey)).d
      }
    },

    async hashForSignature(text: string) {
      const hash: Buffer = await sha256(settings.parse(text))
      return hash.toString('hex')
    },

    async signHash(hash: string, signKeyPair: KeyPair) {
      const jwk = settings.jwk(signKeyPair.pubKey, signKeyPair.privKey)
      const key = await subtle.importKey('jwk', jwk, settings.ecdsa.pair, false, ['sign'])
      const sig: Uint8Array = await subtle.sign(
        settings.ecdsa.sign,
        key,
        new Uint8Array(Buffer.from(hash, 'hex'))
      )
      return Buffer.from(sig, 'binary').toString('base64')
    },

    async verifyHashSignature(hash: string, signature: string, signPubKey: string) {
      const jwk = settings.jwk(signPubKey)
      const hashArray = new Uint8Array(Buffer.from(hash, 'hex'))
      const sig = new Uint8Array(Buffer.from(signature, 'base64'))

      // Beware this was a source of a memory leak for notabug, worked around in SEA may need to do similar here
      // https://github.com/PeculiarVentures/node-webcrypto-ossl/issues/136
      const key = await subtle.importKey('jwk', jwk, settings.ecdsa.pair, false, ['verify'])
      return subtle.verify(settings.ecdsa.sign, key, sig, hashArray)
    },

    async cryptKeyGen() {
      const keys = await subtle.generateKey(settings.ecdh, true, ['deriveKey'])
      const [priv, pub] = await Promise.all([
        subtle.exportKey('jwk', keys.privateKey),
        subtle.exportKey('jwk', keys.publicKey)
      ])

      return {
        privKey: priv.d,
        pubKey: pub.x + '.' + pub.y
      }
    },

    async encrypt(privKey: string, plaintext: string) {
      return encrypt(plaintext, privKey)
    },

    async decrypt(privKey: string, plaintext: string) {
      return decrypt(plaintext, privKey)
    },

    async hashNodeKey(node: any, key: string) {
      const val = node && node[key]
      const parsedVal = Gun.SEA.opt.parse(val)
      const soul = node && node._ && node._['#']
      const prepped = Gun.SEA.opt.prep(parsedVal, key, node, soul)
      return SEA.hashForSignature(settings.parse(prepped))
    },

    // Mainly to aid with testing
    async readNodeKey(node: any, key: string, pair: string | boolean = false) {
      const soul = node && node._ && node._['#']
      const packed = Gun.SEA.opt.pack(node[key], key, node, soul)
      return Gun.SEA.verify(packed, pair).then((r: any) => {
        if (typeof r === 'undefined') {
          throw new Error('invalid sea data')
        }
        return Gun.SEA.opt.unpack(r, key, node)
      })
    },

    // Mainly to aid with testing
    async verifyNode(node: any) {
      const soul = node && node._ && node._['#']
      const authorId: string = Gun.SEA.opt.pub(soul)
      const keys = Object.keys(node).filter(k => k !== '_')
      try {
        await Promise.all(keys.map(key => SEA.readNodeKey(node, key, authorId)))
        return true
      } catch (e) {
        console.warn('verifyNode error', e.stack || e)
        return false
      }
    }
  } as SEAPrimitivesInterface
  return SEA
}
