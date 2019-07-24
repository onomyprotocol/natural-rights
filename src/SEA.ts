const Gun = require('gun/gun')
const shimBase = require('gun/sea/shim')
const sha256 = require('gun/sea/sha256')
const settings = require('gun/sea/settings')
const encrypt = require('gun/sea/encrypt')
const decrypt = require('gun/sea/decrypt')

const { Buffer } = shimBase
const shim = shimBase.ossl || shimBase.subtle

export const SEA = {
  async signKeyGen() {
    const keys = await shim.generateKey(settings.ecdsa.pair, true, ['sign', 'verify'])
    const pub = await shim.exportKey('jwk', keys.publicKey)

    return {
      pubKey: pub.x + '.' + pub.y,
      privKey: (await shim.exportKey('jwk', keys.privateKey)).d
    }
  },

  async hashForSignature(text: string) {
    const hash: Buffer = await sha256(settings.parse(text))
    return hash.toString('hex')
  },

  async signHash(hash: string, signKeyPair: KeyPair) {
    const jwk = settings.jwk(signKeyPair.pubKey, signKeyPair.privKey)
    const key = await shim.importKey('jwk', jwk, settings.ecdsa.pair, false, ['sign'])
    const sig: Uint8Array = await shim.sign(
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
    const key = await shim.importKey('jwk', jwk, settings.ecdsa.pair, false, ['verify'])
    return shim.verify(settings.ecdsa.sign, key, sig, hashArray)
  },

  async cryptKeyGen() {
    const keys = await shim.generateKey(settings.ecdh, true, ['deriveKey'])
    const [priv, pub] = await Promise.all([
      shim.exportKey('jwk', keys.privateKey),
      shim.exportKey('jwk', keys.publicKey)
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
