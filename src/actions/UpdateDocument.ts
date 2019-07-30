import { ActionHandler } from './ActionHandler'
import { LocalService } from '../LocalService'

export class UpdateDocument extends ActionHandler {
  payload: UpdateDocumentAction

  constructor(userId: string, deviceId: string, payload: UpdateDocumentAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(service: LocalService) {
    if (!this.userId) return false
    return service.getHasReadAccess(this.userId, this.payload.documentId)
  }

  async execute(service: LocalService) {
    const document = (await service.db.getDocument(this.payload.documentId)) as DocumentRecord

    await service.db.putDocument({
      ...document,
      id: this.payload.documentId,
      cryptUserId: this.payload.cryptUserId,
      cryptPubKey: this.payload.cryptPubKey,
      encCryptPrivKey: this.payload.encCryptPrivKey
    })
    return this.payload as UpdateDocumentResult
  }
}
