import { ActionHandler } from './ActionHandler'

export class RemoveDevice extends ActionHandler {
  payload: RemoveDeviceAction

  constructor(userId: string, deviceId: string, payload: RemoveDeviceAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(db: DatabaseInterface) {
    return this.payload.userId === this.userId
  }

  async execute(db: DatabaseInterface) {
    await db.deleteDevice(this.payload.userId, this.payload.deviceId)
    return {
      userId: this.payload.userId,
      deviceId: this.payload.deviceId
    } as RemoveDeviceResult
  }
}
