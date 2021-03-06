import { ActionHandler } from './ActionHandler'
import { LocalService } from '../LocalService'

export class GrantAccess extends ActionHandler {
  payload: GrantAccessAction

  constructor(userId: string, deviceId: string, payload: GrantAccessAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(service: LocalService) {
    if (!this.userId) return false
    return service.getHasReadAccess(this.userId, this.payload.documentId)
  }

  async execute(service: LocalService) {
    const existing = await service.db.getGrant(
      this.payload.documentId,
      this.payload.kind,
      this.payload.id
    )
    await service.db.putGrant({
      canSign: false,
      ...existing,
      ...this.payload
    })
    return this.payload as GrantAccessResult
  }
}
