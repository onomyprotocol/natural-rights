import { ActionHandler } from './ActionHandler'

export class CreateGroup extends ActionHandler {
  payload: CreateGroupAction

  constructor(userId: string, deviceId: string, payload: CreateGroupAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(db: DatabaseInterface) {
    return this.payload.userId === this.userId
  }

  async execute(db: DatabaseInterface) {
    await db.putGroup({
      id: this.payload.groupId,
      cryptPubKey: this.payload.cryptPubKey,
      encCryptPrivKey: this.payload.encCryptPrivKey
    })

    return this.payload as CreateGroupResult
  }
}
