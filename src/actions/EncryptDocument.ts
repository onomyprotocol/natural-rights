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
    return this.payload.userId === this.userId
  }

  async execute(service: LocalService) {
    await service.db.putDocument({
      id: this.payload.documentId,
      userId: this.payload.userId,
      encCryptPrivKey: this.payload.encCryptPrivKey
    })
    return this.payload as EncryptDocumentResult
  }
}
