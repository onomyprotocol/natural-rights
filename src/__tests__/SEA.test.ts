import { initSEA } from '../SEA'

const Gun = require('gun/gun')
require('gun/sea')
const SEA = initSEA(Gun)

describe('SEA signatures', () => {
  const documentA = 'This is a test document'
  const documentB = 'This is a different test document'

  let pairA: KeyPair
  let pairB: KeyPair
  let hashDocumentA: string
  let hashDocumentB: string
  let signatureADocumentA: string
  let signatureBDocumentA: string
  let signatureADocumentB: string
  let signatureBDocumentB: string

  beforeEach(async () => {
    pairA = await SEA.signKeyGen()
    pairB = await SEA.signKeyGen()
    hashDocumentA = await SEA.hashForSignature(documentA)
    hashDocumentB = await SEA.hashForSignature(documentB)
    signatureADocumentA = await SEA.signHash(hashDocumentA, pairA)
    signatureBDocumentA = await SEA.signHash(hashDocumentA, pairB)
    signatureADocumentB = await SEA.signHash(hashDocumentB, pairA)
    signatureBDocumentB = await SEA.signHash(hashDocumentB, pairB)
  })

  it('verifies correct signatures', async () => {
    expect(await SEA.verifyHashSignature(hashDocumentA, signatureADocumentA, pairA.pubKey)).toEqual(
      true
    )
    expect(await SEA.verifyHashSignature(hashDocumentA, signatureBDocumentA, pairB.pubKey)).toEqual(
      true
    )
    expect(await SEA.verifyHashSignature(hashDocumentB, signatureADocumentB, pairA.pubKey)).toEqual(
      true
    )
    expect(await SEA.verifyHashSignature(hashDocumentB, signatureBDocumentB, pairB.pubKey)).toEqual(
      true
    )
  })

  it('does not verify signatures for pairA from pairB', async () => {
    expect(await SEA.verifyHashSignature(hashDocumentA, signatureBDocumentA, pairA.pubKey)).toEqual(
      false
    )
    expect(await SEA.verifyHashSignature(hashDocumentB, signatureBDocumentB, pairA.pubKey)).toEqual(
      false
    )
  })

  it('does not verify signatures on different document for same user', async () => {
    expect(await SEA.verifyHashSignature(hashDocumentA, signatureADocumentB, pairA.pubKey)).toEqual(
      false
    )
    expect(await SEA.verifyHashSignature(hashDocumentA, signatureBDocumentB, pairB.pubKey)).toEqual(
      false
    )
  })
})
