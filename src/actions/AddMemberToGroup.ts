import { ActionHandler } from './ActionHandler'

export class AddMemberToGroup extends ActionHandler {
  payload: AddMemberToGroupAction

  constructor(userId: string, deviceId: string, payload: AddMemberToGroupAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(db: DatabaseInterface) {
    return db.getIsGroupAdmin(this.payload.groupId, this.userId)
  }

  async execute(db: DatabaseInterface) {
    await db.putMembership({
      groupId: this.payload.groupId,
      userId: this.payload.userId,
      cryptTransformKey: this.payload.cryptTransformKey,
      encGroupCryptPrivKey: '',
      encGroupSignPrivKey: ''
    })
    return this.payload as AddMemberToGroupResult
  }
}
