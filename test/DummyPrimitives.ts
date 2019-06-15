interface KeyPair {
  pubKey: string
  privKey: string
}

async function cryptKeyGen() {
  const key = Math.floor(Math.random() * 16777215).toString(16)
  return {
    pubKey: `cryptPubKey-${key}`,
    privKey: `cryptPrivKey-${key}`
  }
}
async function signKeyGen() {
  const key = Math.floor(Math.random() * 16777215).toString(16)
  return {
    pubKey: `cryptPubKey-${key}`,
    privKey: `cryptPrivKey-${key}`
  }
}

async function cryptTransformKeyGen(fromKeyPair: KeyPair, toPubKey: string) {
  return `cryptTransform:${fromKeyPair.privKey}:${toPubKey}`
}

async function encrypt(pubKey: string, plaintext: string) {
  return `encrypted:${pubKey}:${plaintext}`
}

async function decrypt(keyPair: KeyPair, ciphertext: string) {
  return ciphertext.replace(`encrypted:${keyPair.pubKey}:`, '')
}

async function cryptTransform(transformKey: string, ciphertext: string) {
  const re = /encrypted:.*:/
  const [m1, cryptPubKey, plaintext] = ciphertext.split(':')
  const [method, privKey, pubKey] = transformKey.split(':')
  return encrypt(pubKey, plaintext) // NOTE: real primitive SHOULD NOT DECRYPT
}

async function sign(keyPair: KeyPair, text: string) {
  return `signature:${keyPair.pubKey}:${text}`
}

async function verify(pubKey: string, signature: string, text: string) {
  return signature.replace(`signature:${pubKey}:`, '') === text
}

export const Primitives = {
  cryptKeyGen,
  signKeyGen,
  encrypt,
  decrypt,
  cryptTransformKeyGen,
  cryptTransform,
  sign,
  verify
}
