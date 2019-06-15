import { ActionHandler } from './ActionHandler'
import { LocalService } from '../LocalService'

export class RevokeAccess extends ActionHandler {
  payload: RevokeAccessAction

  constructor(userId: string, deviceId: string, payload: RevokeAccessAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(service: LocalService) {
    return service.getHasAccess(this.userId, this.payload.documentId)
  }

  async execute(service: LocalService) {
    await service.db.deleteGrant(this.payload.documentId, this.payload.kind, this.payload.id)
    return {
      documentId: this.payload.documentId,
      kind: this.payload.kind,
      id: this.payload.id
    } as RevokeAccessResult
  }
}
