import { ActionHandler } from './ActionHandler'
import { LocalService } from '../LocalService'

export class RemoveDevice extends ActionHandler {
  payload: RemoveDeviceAction

  constructor(userId: string, deviceId: string, payload: RemoveDeviceAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(service: LocalService) {
    if (!this.userId) return this.deviceId === this.payload.deviceId
    return this.payload.userId === this.userId
  }

  async execute(service: LocalService) {
    await service.db.deleteDevice(this.payload.userId, this.payload.deviceId)
    return {
      userId: this.payload.userId,
      deviceId: this.payload.deviceId
    } as RemoveDeviceResult
  }
}
