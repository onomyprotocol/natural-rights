import { ActionHandler } from './ActionHandler'

export class AddDevice extends ActionHandler {
  payload: AddDeviceAction

  constructor(userId: string, deviceId: string, payload: AddDeviceAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(db: DatabaseInterface) {
    return this.payload.userId === this.userId
  }

  async execute(db: DatabaseInterface) {
    await db.putDevice({
      id: this.payload.deviceId,
      userId: this.payload.userId,
      signPubKey: this.payload.signPubKey,
      cryptPubKey: this.payload.cryptPubKey,
      cryptTransformKey: this.payload.cryptTransformKey
    })

    return this.payload as AddDeviceResult
  }
}
