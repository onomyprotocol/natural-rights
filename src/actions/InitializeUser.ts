import { ActionHandler } from './ActionHandler'
import { LocalService } from '../LocalService'

export class InitializeUser extends ActionHandler {
  payload: InitializeUserAction

  constructor(userId: string, deviceId: string, payload: InitializeUserAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(service: LocalService) {
    if (this.userId !== this.payload.userId) return false
    const existing = await service.db.getUser(this.userId)
    return !existing
  }

  async execute(service: LocalService) {
    await service.db.putUser({
      id: this.payload.userId,
      signPubKey: this.payload.signPubKey,
      cryptPubKey: this.payload.cryptPubKey,
      encCryptPrivKey: this.payload.encCryptPrivKey,
      encSignPrivKey: this.payload.encSignPrivKey
    })

    return this.payload as InitializeUserResult
  }
}
