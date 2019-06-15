import { ActionHandler } from './ActionHandler'
import { LocalService } from '../LocalService'

export class UpdateDocument extends ActionHandler {
  payload: UpdateDocumentAction

  constructor(userId: string, deviceId: string, payload: UpdateDocumentAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(service: LocalService) {
    return service.getHasAccess(this.userId, this.payload.documentId)
  }

  async execute(service: LocalService) {
    await service.db.putDocument({
      id: this.payload.documentId,
      userId: this.payload.userId,
      encCryptPrivKey: this.payload.encCryptPrivKey
    })
    return this.payload as UpdateDocumentResult
  }
}
