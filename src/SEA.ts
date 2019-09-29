import {
  pair as createPairs,
  parse,
  encrypt,
  decrypt,
  hashNodeKey,
  hashForSignature,
  signHash,
  verifyHashSignature,
  pubFromSoul,
  unpack
} from '@notabug/gun-sear'

export const SEA = {
  async signKeyGen() {
    const pairs = await createPairs()

    return {
      pubKey: pairs.pub,
      privKey: pairs.priv
    }
  },

  hashForSignature,

  signHash(hash: string, signKeyPair: KeyPair) {
    return signHash(hash, {
      pub: signKeyPair.pubKey,
      priv: signKeyPair.privKey
    })
  },

  verifyHashSignature,

  async cryptKeyGen() {
    const pairs = await createPairs()

    return {
      pubKey: pairs.epub,
      privKey: pairs.epriv
    }
  },

  async encrypt(privKey: string, plaintext: string) {
    return encrypt(plaintext, privKey)
  },

  async decrypt(privKey: string, plaintext: string) {
    return decrypt(plaintext, privKey)
  },

  hashNodeKey,

  // Mainly to aid with testing
  async readNodeKey(node: any, key: string, _pair: string | false = false) {
    // const soul = node && node._ && node._["#"]
    const value = unpack(parse(node[key]), key, node)
    return value
  },

  // Mainly to aid with testing
  async verifyNode(node: any) {
    const soul = node && node._ && node._['#']
    const authorId = pubFromSoul(soul)
    const keys = Object.keys(node).filter(k => k !== '_')
    if (!authorId) return false
    try {
      await Promise.all(keys.map(key => SEA.readNodeKey(node, key, authorId)))
      return true
    } catch (e) {
      console.warn('verifyNode error', e.stack || e)
      return false
    }
  }
} as SEAPrimitivesInterface
