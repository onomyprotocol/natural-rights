import { ActionHandler } from './ActionHandler'

export class GrantAccess extends ActionHandler {
  payload: GrantAccessAction

  constructor(userId: string, deviceId: string, payload: GrantAccessAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(db: DatabaseInterface) {
    return db.getHasAccess(this.userId, this.payload.documentId)
  }

  async execute(db: DatabaseInterface) {
    await db.putGrant({
      documentId: this.payload.documentId,
      userOrGroupId: this.payload.userId, // TODO: figure this out
      encCryptPrivKey: this.payload.encCryptPrivKey
    })
    return this.payload as GrantAccessResult
  }
}
