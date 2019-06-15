export class ActionHandler {
  userId: string
  deviceId: string

  constructor(userId: string, deviceId: string) {
    this.userId = userId
    this.deviceId = deviceId
  }

  async checkIsAuthorized(db: DatabaseInterface) {
    return false
  }

  async execute(db: DatabaseInterface) {
    return null as ResultType
  }
}
