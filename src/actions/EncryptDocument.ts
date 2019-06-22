import { ActionHandler } from './ActionHandler'
import { LocalService } from '../LocalService'

export class EncryptDocument extends ActionHandler {
  payload: EncryptDocumentAction

  constructor(userId: string, deviceId: string, payload: EncryptDocumentAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(service: LocalService) {
    const existing = await service.db.getDocument(this.payload.documentId)
    if (existing) return false
    return this.payload.cryptUserId === this.userId
  }

  async execute(service: LocalService) {
    await service.db.putDocument({
      id: this.payload.documentId,
      cryptUserId: this.payload.cryptUserId,
      cryptPubKey: this.payload.cryptPubKey,
      encCryptPrivKey: this.payload.encCryptPrivKey,
      signUserId: this.payload.signUserId,
      encSignPrivKey: this.payload.encSignPrivKey
    })
    return this.payload as EncryptDocumentResult
  }
}
