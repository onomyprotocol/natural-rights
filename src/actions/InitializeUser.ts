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
    const device = await service.db.getDevice(this.deviceId)
    if (!device || device.userId) return false
    const existing = await service.db.getUser(this.payload.userId)
    return !existing
  }

  async execute(service: LocalService) {
    const rootDocSignKeyPair = await service.sea.signKeyGen()

    await Promise.all([
      service.db.putUser({
        id: this.payload.userId,
        signPubKey: this.payload.signPubKey,
        cryptPubKey: this.payload.cryptPubKey,
        encCryptPrivKey: this.payload.encCryptPrivKey,
        encSignPrivKey: this.payload.encSignPrivKey,
        rootDocumentId: rootDocSignKeyPair.pubKey
      }),

      service.db.putDocument({
        // Private root document
        id: rootDocSignKeyPair.pubKey,
        cryptUserId: this.payload.userId,
        cryptPubKey: this.payload.cryptPubKey,
        encCryptPrivKey: this.payload.encCryptPrivKey,
        creatorId: this.payload.userId,
        signPrivKey: rootDocSignKeyPair.privKey
      })
    ])

    return this.payload as InitializeUserResult
  }
}
