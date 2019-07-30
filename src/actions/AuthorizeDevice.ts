import { ActionHandler } from './ActionHandler'
import { LocalService } from '../LocalService'

export class AuthorizeDevice extends ActionHandler {
  payload: AuthorizeDeviceAction

  constructor(userId: string, deviceId: string, payload: AuthorizeDeviceAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(service: LocalService) {
    const device = await service.db.getDevice(this.payload.deviceId)
    if (device && device.userId && device.userId !== this.userId) return false
    return this.payload.userId === this.userId
  }

  async execute(service: LocalService) {
    const device = await service.db.getDevice(this.payload.deviceId)

    if (!device) throw new Error('Unknown device')

    await service.db.putDevice({
      ...device,
      id: this.payload.deviceId,
      userId: this.payload.userId,
      cryptTransformKey: this.payload.cryptTransformKey
    })

    return this.payload as AuthorizeDeviceResult
  }
}
