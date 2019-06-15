import { ActionHandler } from './ActionHandler'
import { LocalService } from '../LocalService'

export class GrantAccess extends ActionHandler {
  payload: GrantAccessAction

  constructor(userId: string, deviceId: string, payload: GrantAccessAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(service: LocalService) {
    return service.getHasAccess(this.userId, this.payload.documentId)
  }

  async execute(service: LocalService) {
    await service.db.putGrant({
      documentId: this.payload.documentId,
      kind: this.payload.kind,
      id: this.payload.id,
      encCryptPrivKey: this.payload.encCryptPrivKey
    })
    return this.payload as GrantAccessResult
  }
}
