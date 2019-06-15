async function cryptKeyGen() {
  throw new Error('Not yet implemented')
  return {
    pubKey: '',
    privKey: ''
  }
}
async function signKeyGen() {
  throw new Error('Not yet implemented')
  return {
    pubKey: '',
    privKey: ''
  }
}

async function cryptTransformKeyGen(fromKeyPair: KeyPair, toPubKey: string) {
  throw new Error('Not yet implemented')
  return ''
}

async function encrypt(pubKey: string, plaintext: string) {
  throw new Error('Not yet implemented')
  return ''
}

async function decrypt(keyPair: KeyPair, ciphertext: string) {
  throw new Error('Not yet implemented')
  return ''
}

async function cryptTransform(transformKey: string, ciphertext: string) {
  throw new Error('Not yet implemented')
  return ''
}

async function sign(keyPair: KeyPair, text: string) {
  throw new Error('Not yet implemented')
  return ''
}

async function verify(pubKey: string, signature: string, text: string) {
  throw new Error('Not yet implemented')
  return false
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
} as PrimitivesInterface
