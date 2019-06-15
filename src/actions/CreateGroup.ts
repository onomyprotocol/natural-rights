import { ActionHandler } from './ActionHandler'
import { LocalService } from '../LocalService'

export class CreateGroup extends ActionHandler {
  payload: CreateGroupAction

  constructor(userId: string, deviceId: string, payload: CreateGroupAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(service: LocalService) {
    return this.payload.userId === this.userId
  }

  async execute(service: LocalService) {
    await service.db.putGroup({
      id: this.payload.groupId,
      userId: this.payload.userId,
      cryptPubKey: this.payload.cryptPubKey,
      encCryptPrivKey: this.payload.encCryptPrivKey
    })

    return this.payload as CreateGroupResult
  }
}
