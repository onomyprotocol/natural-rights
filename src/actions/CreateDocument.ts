import { ActionHandler } from './ActionHandler'
import { LocalService } from '../LocalService'

export class CreateDocument extends ActionHandler {
  payload: CreateDocumentAction

  constructor(userId: string, deviceId: string, payload: CreateDocumentAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(service: LocalService) {
    return this.payload.cryptUserId === this.userId && this.userId === this.payload.creatorId
  }

  async execute(service: LocalService) {
    const signKeyPair = await service.sea.signKeyGen()
    const existing = await service.db.getDocument(signKeyPair.pubKey)
    if (existing) return null

    await service.db.putDocument({
      id: signKeyPair.pubKey,
      cryptUserId: this.payload.cryptUserId,
      cryptPubKey: this.payload.cryptPubKey,
      encCryptPrivKey: this.payload.encCryptPrivKey,
      creatorId: this.payload.creatorId,
      signPrivKey: signKeyPair.privKey
    })

    return {
      ...this.payload,
      documentId: signKeyPair.pubKey
    } as CreateDocumentResult
  }
}
