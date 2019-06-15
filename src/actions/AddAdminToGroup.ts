import { ActionHandler } from './ActionHandler'
import { LocalService } from '../LocalService'

export class AddAdminToGroup extends ActionHandler {
  payload: AddAdminToGroupAction

  constructor(userId: string, deviceId: string, payload: AddAdminToGroupAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(service: LocalService) {
    return service.getIsGroupAdmin(this.payload.groupId, this.userId)
  }

  async execute(service: LocalService) {
    const membership = await service.db.getMembership(this.payload.groupId, this.payload.userId)

    if (!membership) throw new Error('No membership for user')

    await service.db.putMembership({
      ...membership,
      encGroupCryptPrivKey: this.payload.encCryptPrivKey
    })

    return this.payload as AddAdminToGroupResult
  }
}
