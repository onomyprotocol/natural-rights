import { ActionHandler } from './ActionHandler'

export class InitializeUser extends ActionHandler {
  payload: InitializeUserAction

  constructor(userId: string, deviceId: string, payload: InitializeUserAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(db: DatabaseInterface) {
    if (this.userId !== this.payload.userId) return false
    const existing = await db.getUser(this.userId)
    return !existing
  }

  async execute(db: DatabaseInterface) {
    await db.putUser({
      id: this.payload.userId,
      signPubKey: this.payload.signPubKey,
      cryptPubKey: this.payload.cryptPubKey,
      encCryptPrivKey: this.payload.encCryptPrivKey,
      encSignPrivKey: this.payload.encSignPrivKey
    })

    return this.payload as InitializeUserResult
  }
}
