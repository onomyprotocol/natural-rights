const shimBase = require('gun/sea/shim')
const { Buffer } = shimBase
const sha256 = require('gun/sea/sha256')
const settings = require('gun/sea/settings')
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
    const hash: Buffer = await sha256(text)
    return hash.toString('hex')
  },

  async signHash(hash: string, signKeyPair: KeyPair) {
    const jwk = settings.jwk(signKeyPair.pubKey, signKeyPair.privKey)
    const key = await shim.importKey('jwk', jwk, settings.ecdsa.pair, false, ['sign'])
    const sig: Uint8Array = await shim.sign(
      settings.ecdsa.sign,
      key,
      new Uint8Array(Buffer.from(hash, 'base64'))
    )
    return Buffer.from(sig, 'binary').toString('base64')
  },

  async verifyHashSignature(hash: string, signature: string, signPubKey: string) {
    const jwk = settings.jwk(signPubKey)
    const hashArray = new Uint8Array(Buffer.from(hash, 'base64'))
    const sig = new Uint8Array(Buffer.from(signature, 'base64'))

    // Beware this was a source of a memory leak for notabug, worked around in SEA may need to do similar here
    // https://github.com/PeculiarVentures/node-webcrypto-ossl/issues/136
    const key = await shim.importKey('jwk', jwk, settings.ecdsa.pair, false, ['verify'])
    return shim.verify(settings.ecdsa.sign, key, sig, hashArray)
  }
} as SEAPrimitivesInterface
