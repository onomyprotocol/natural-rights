import { LocalService } from '../LocalService'

export class ActionHandler {
  userId: string
  deviceId: string

  constructor(userId: string, deviceId: string) {
    this.userId = userId
    this.deviceId = deviceId
  }

  async checkIsAuthorized(service: LocalService) {
    return false
  }

  async execute(service: LocalService) {
    return null as ResultType
  }
}
